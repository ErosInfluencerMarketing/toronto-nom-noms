import { useState, useCallback, useRef, useEffect } from 'react';
import { GoogleMap, useJsApiLoader, InfoWindowF } from '@react-google-maps/api';
import { MarkerClusterer } from '@googlemaps/markerclusterer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Loader2, Coffee, MapPin, Search, ArrowLeft, Download, CheckSquare, Square } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { useLeads } from '@/hooks/useLeads';
import { supabase } from '@/integrations/supabase/client';
import { LeadFormData } from '@/types/lead';

const SYDNEY_CENTER = { lat: -33.8688, lng: 151.2093 };
const MAP_CONTAINER = { width: '100%', height: '100%' };
const LIBRARIES: ('places')[] = ['places'];

const SYDNEY_BOUNDS = {
  north: -33.65,
  south: -34.05,
  west: 150.95,
  east: 151.35,
};

const GRID_COLS = 6;
const GRID_ROWS = 5;

interface CafePlace {
  placeId: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  rating?: number;
  totalRatings?: number;
  openNow?: boolean;
  photoUrl?: string;
  website?: string;
}

interface CafeMapInnerProps {
  apiKey: string;
}

function generateGridCenters() {
  const centers: { lat: number; lng: number }[] = [];
  const latStep = (SYDNEY_BOUNDS.north - SYDNEY_BOUNDS.south) / GRID_ROWS;
  const lngStep = (SYDNEY_BOUNDS.east - SYDNEY_BOUNDS.west) / GRID_COLS;
  for (let r = 0; r < GRID_ROWS; r++) {
    for (let c = 0; c < GRID_COLS; c++) {
      centers.push({
        lat: SYDNEY_BOUNDS.south + latStep * (r + 0.5),
        lng: SYDNEY_BOUNDS.west + lngStep * (c + 0.5),
      });
    }
  }
  return centers;
}

function parsePlaceResult(r: google.maps.places.PlaceResult): CafePlace {
  let photoUrl: string | undefined;
  if (r.photos && r.photos.length > 0) {
    photoUrl = r.photos[0].getUrl({ maxWidth: 48, maxHeight: 48 });
  }
  return {
    placeId: r.place_id || '',
    name: r.name || 'Unknown',
    address: r.formatted_address || '',
    lat: r.geometry?.location?.lat() || 0,
    lng: r.geometry?.location?.lng() || 0,
    rating: r.rating,
    totalRatings: r.user_ratings_total,
    openNow: r.opening_hours?.isOpen?.(),
    photoUrl,
    website: r.website,
  };
}

function cafeToLead(cafe: CafePlace): LeadFormData {
  return {
    business_name: cafe.name,
    address: cafe.address,
    city: 'Sydney',
    category: 'Cafe',
    website: cafe.website,
    platform: 'noms',
    status: 'new',
    notes: `Rating: ${cafe.rating ?? 'N/A'}${cafe.totalRatings ? ` (${cafe.totalRatings} reviews)` : ''} | Google Place ID: ${cafe.placeId}`,
  };
}

export default function CafeMapInner({ apiKey }: CafeMapInnerProps) {
  const navigate = useNavigate();
  const { bulkCreateLeads } = useLeads();
  const [cafes, setCafes] = useState<CafePlace[]>([]);
  const [selectedCafe, setSelectedCafe] = useState<CafePlace | null>(null);
  const [searching, setSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [progress, setProgress] = useState(0);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [importing, setImporting] = useState(false);
  const [enrichProgress, setEnrichProgress] = useState('');
  const mapRef = useRef<google.maps.Map | null>(null);
  const serviceRef = useRef<google.maps.places.PlacesService | null>(null);
  const abortRef = useRef(false);
  const markersRef = useRef<google.maps.Marker[]>([]);
  const clustererRef = useRef<MarkerClusterer | null>(null);

  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: apiKey,
    libraries: LIBRARIES,
  });

  const toggleSelect = (placeId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(placeId)) next.delete(placeId);
      else next.add(placeId);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === cafes.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(cafes.map((c) => c.placeId)));
    }
  };

  const enrichAndImport = async (cafesToImport: CafePlace[]) => {
    // Enrich in batches of 5
    const BATCH_SIZE = 5;
    const allLeads: LeadFormData[] = [];

    for (let i = 0; i < cafesToImport.length; i += BATCH_SIZE) {
      const batch = cafesToImport.slice(i, i + BATCH_SIZE);
      setEnrichProgress(`Enriching ${i + 1}-${Math.min(i + BATCH_SIZE, cafesToImport.length)} of ${cafesToImport.length}…`);

      try {
        const { data, error } = await supabase.functions.invoke('enrich-cafes', {
          body: {
            cafes: batch.map(c => ({
              placeId: c.placeId,
              name: c.name,
              address: c.address,
              rating: c.rating,
              totalRatings: c.totalRatings,
            })),
          },
        });

        if (error) throw error;

        const enrichedCafes = data?.cafes || batch;
        for (const ec of enrichedCafes) {
          const original = batch.find(b => b.placeId === ec.placeId) || ec;
          allLeads.push({
            business_name: ec.name || original.name,
            address: ec.address || original.address,
            city: 'Sydney',
            category: 'Cafe',
            website: ec.website || original.website,
            email: ec.email || undefined,
            instagram_handle: ec.instagram_handle || undefined,
            platform: 'noms',
            status: 'new',
            notes: [
              `Rating: ${original.rating ?? 'N/A'}${original.totalRatings ? ` (${original.totalRatings} reviews)` : ''}`,
              ec.phone ? `Phone: ${ec.phone}` : '',
              `Google Place ID: ${ec.placeId}`,
            ].filter(Boolean).join(' | '),
          });
        }
      } catch (e) {
        console.error('Enrich batch error:', e);
        // Fall back to non-enriched import for this batch
        for (const cafe of batch) {
          allLeads.push(cafeToLead(cafe));
        }
      }
    }

    // Insert leads in chunks of 100
    setEnrichProgress('Saving leads…');
    for (let i = 0; i < allLeads.length; i += 100) {
      await bulkCreateLeads.mutateAsync(allLeads.slice(i, i + 100));
    }

    return allLeads.length;
  };

  const handleImportSelected = async () => {
    const toImport = cafes.filter((c) => selectedIds.has(c.placeId));
    if (toImport.length === 0) {
      toast.error('No cafes selected');
      return;
    }

    setImporting(true);
    try {
      const count = await enrichAndImport(toImport);
      toast.success(`Imported ${count} cafes as enriched leads`);
      setSelectedIds(new Set());
    } catch (e: any) {
      toast.error('Import failed: ' + e.message);
    } finally {
      setImporting(false);
      setEnrichProgress('');
    }
  };

  const handleImportSingle = async (cafe: CafePlace) => {
    setImporting(true);
    try {
      await enrichAndImport([cafe]);
      toast.success(`Imported "${cafe.name}" as an enriched lead`);
      setSelectedCafe(null);
    } catch (e: any) {
      toast.error('Import failed: ' + e.message);
    } finally {
      setImporting(false);
      setEnrichProgress('');
    }
  };

  const searchAllPages = useCallback(
    (service: google.maps.places.PlacesService, request: google.maps.places.TextSearchRequest): Promise<google.maps.places.PlaceResult[]> => {
      return new Promise((resolve) => {
        const all: google.maps.places.PlaceResult[] = [];
        const handler = (
          results: google.maps.places.PlaceResult[] | null,
          status: google.maps.places.PlacesServiceStatus,
          pagination: google.maps.places.PlaceSearchPagination | null
        ) => {
          if (status === google.maps.places.PlacesServiceStatus.OK && results) {
            all.push(...results);
            if (pagination && pagination.hasNextPage && !abortRef.current) {
              setTimeout(() => pagination.nextPage(), 350);
            } else {
              resolve(all);
            }
          } else {
            resolve(all);
          }
        };
        service.textSearch(request, handler);
      });
    },
    []
  );

  const searchCafes = useCallback(
    async (map?: google.maps.Map) => {
      const currentMap = map || mapRef.current;
      const service = serviceRef.current;
      if (!currentMap || !service) return;

      abortRef.current = false;
      setSearching(true);
      setSelectedCafe(null);
      setSelectedIds(new Set());
      setProgress(0);

      const queryBase = searchQuery ? `${searchQuery} cafe` : 'cafe';
      const gridCenters = generateGridCenters();
      const seen = new Map<string, CafePlace>();
      let completed = 0;

      for (const center of gridCenters) {
        if (abortRef.current) break;

        const request: google.maps.places.TextSearchRequest = {
          query: queryBase,
          location: center,
          radius: 3000,
          type: 'cafe',
        };

        const results = await searchAllPages(service, request);
        for (const r of results) {
          const parsed = parsePlaceResult(r);
          if (parsed.placeId && !seen.has(parsed.placeId)) {
            seen.set(parsed.placeId, parsed);
          }
        }

        completed++;
        setProgress(Math.round((completed / gridCenters.length) * 100));
        setCafes(Array.from(seen.values()));

        await new Promise((res) => setTimeout(res, 200));
      }

      const final = Array.from(seen.values());
      setCafes(final);
      setSearching(false);
      setProgress(100);
      toast.success(`Found ${final.length} cafes across Sydney`);
    },
    [searchQuery, searchAllPages]
  );

  const onMapLoad = useCallback(
    (map: google.maps.Map) => {
      mapRef.current = map;
      serviceRef.current = new google.maps.places.PlacesService(map);
      clustererRef.current = new MarkerClusterer({
        map,
        markers: [],
        renderer: {
          render: ({ count, position }) => {
            const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="50" height="50" viewBox="0 0 50 50">
              <circle cx="25" cy="25" r="24" fill="%2314b8a6" stroke="white" stroke-width="2" opacity="0.9"/>
              <text x="25" y="30" text-anchor="middle" fill="white" font-size="14" font-weight="bold" font-family="sans-serif">${count}</text>
            </svg>`;
            return new google.maps.Marker({
              position,
              icon: {
                url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(svg),
                scaledSize: new google.maps.Size(50, 50),
              },
              label: { text: ' ', color: 'transparent' },
              zIndex: Number(google.maps.Marker.MAX_ZINDEX) + count,
            });
          },
        },
      });
      searchCafes(map);
    },
    [searchCafes]
  );

  useEffect(() => {
    if (!mapRef.current || !clustererRef.current) return;

    markersRef.current.forEach((m) => m.setMap(null));
    markersRef.current = [];

    const defaultIcon = 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(
      `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24"><circle cx="12" cy="12" r="12" fill="%2314b8a6" stroke="white" stroke-width="2"/><g transform="translate(4,4) scale(0.67)"><path d="M17 8h1a4 4 0 1 1 0 8h-1" fill="white" stroke="white"/><path d="M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4Z" fill="white" stroke="white"/><line x1="6" x2="6" y1="2" y2="4" stroke="white"/><line x1="10" x2="10" y1="2" y2="4" stroke="white"/><line x1="14" x2="14" y1="2" y2="4" stroke="white"/></g></svg>`
    );

    const newMarkers = cafes.map((cafe) => {
      const marker = new google.maps.Marker({
        position: { lat: cafe.lat, lng: cafe.lng },
        icon: {
          url: cafe.photoUrl || defaultIcon,
          scaledSize: new google.maps.Size(44, 44),
        },
      });
      marker.addListener('click', () => setSelectedCafe(cafe));
      return marker;
    });

    markersRef.current = newMarkers;
    clustererRef.current.clearMarkers();
    clustererRef.current.addMarkers(newMarkers);
  }, [cafes]);

  const handleStop = () => {
    abortRef.current = true;
  };

  if (!isLoaded) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-3 text-muted-foreground">Loading Google Maps…</span>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Header */}
      <div className="border-b border-border bg-card px-4 py-3 flex items-center gap-3 flex-wrap">
        <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <Coffee className="h-5 w-5 text-primary" />
        <h1 className="text-lg font-semibold text-foreground">Sydney Cafes</h1>

        <div className="flex-1 flex items-center gap-2 max-w-md ml-auto">
          <Input
            placeholder="Search cafes…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && searchCafes()}
            className="h-9"
          />
          <Button size="sm" onClick={() => searchCafes()} disabled={searching}>
            {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
          </Button>
          {searching && (
            <Button size="sm" variant="destructive" onClick={handleStop}>
              Stop
            </Button>
          )}
        </div>

        <span className="text-sm text-muted-foreground hidden sm:block whitespace-nowrap">
          {cafes.length} cafe{cafes.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Selection / Import bar */}
      {cafes.length > 0 && !searching && (
        <div className="border-b border-border bg-card/80 px-4 py-2 flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={toggleSelectAll}
            className="gap-1.5"
          >
            {selectedIds.size === cafes.length ? (
              <CheckSquare className="h-4 w-4" />
            ) : (
              <Square className="h-4 w-4" />
            )}
            {selectedIds.size === cafes.length ? 'Deselect All' : 'Select All'}
          </Button>

          {selectedIds.size > 0 && (
            <>
              <Badge variant="secondary">{selectedIds.size} selected</Badge>
              <Button
                size="sm"
                onClick={handleImportSelected}
                disabled={importing}
                className="gap-1.5"
              >
                {importing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Download className="h-4 w-4" />
                )}
                {importing ? (enrichProgress || 'Importing…') : 'Enrich & Import as Leads'}
              </Button>
            </>
          )}
        </div>
      )}

      {/* Progress bar */}
      {searching && (
        <div className="px-4 py-1 bg-card border-b border-border">
          <div className="flex items-center gap-3">
            <Progress value={progress} className="flex-1 h-2" />
            <span className="text-xs text-muted-foreground whitespace-nowrap">
              Scanning Sydney… {progress}%
            </span>
          </div>
        </div>
      )}

      {/* Map */}
      <div className="flex-1 relative">
        <GoogleMap
          mapContainerStyle={MAP_CONTAINER}
          center={SYDNEY_CENTER}
          zoom={12}
          onLoad={onMapLoad}
          options={{
            styles: [
              { elementType: 'geometry', stylers: [{ color: '#1a1a2e' }] },
              { elementType: 'labels.text.stroke', stylers: [{ color: '#1a1a2e' }] },
              { elementType: 'labels.text.fill', stylers: [{ color: '#8892b0' }] },
              { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#2d2d44' }] },
              { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0e4a6e' }] },
              { featureType: 'poi', elementType: 'labels', stylers: [{ visibility: 'off' }] },
            ],
            disableDefaultUI: false,
            zoomControl: true,
            streetViewControl: false,
            mapTypeControl: false,
            fullscreenControl: true,
          }}
        >
          {selectedCafe && (
            <InfoWindowF
              position={{ lat: selectedCafe.lat, lng: selectedCafe.lng }}
              onCloseClick={() => setSelectedCafe(null)}
            >
              <div className="p-1 max-w-[240px]" style={{ color: '#1a1a2e' }}>
                <div className="flex items-start justify-between gap-2 mb-1">
                  <h3 className="font-semibold text-sm">{selectedCafe.name}</h3>
                  <Checkbox
                    checked={selectedIds.has(selectedCafe.placeId)}
                    onCheckedChange={() => toggleSelect(selectedCafe.placeId)}
                    className="mt-0.5"
                  />
                </div>
                <p className="text-xs mb-1 flex items-center gap-1" style={{ color: '#64748b' }}>
                  <MapPin className="h-3 w-3 shrink-0" />
                  {selectedCafe.address}
                </p>
                {selectedCafe.rating && (
                  <p className="text-xs">
                    ⭐ {selectedCafe.rating} ({selectedCafe.totalRatings} reviews)
                  </p>
                )}
                {selectedCafe.openNow !== undefined && (
                  <p className={`text-xs font-medium mt-1 ${selectedCafe.openNow ? 'text-green-600' : 'text-red-500'}`}>
                    {selectedCafe.openNow ? 'Open now' : 'Closed'}
                  </p>
                )}
                <button
                  onClick={() => handleImportSingle(selectedCafe)}
                  disabled={importing}
                  className="mt-2 w-full text-xs font-medium py-1.5 px-3 rounded bg-[#14b8a6] text-white hover:bg-[#0d9488] transition-colors disabled:opacity-50"
                >
                  {importing ? 'Importing…' : 'Import as Lead'}
                </button>
              </div>
            </InfoWindowF>
          )}
        </GoogleMap>
      </div>
    </div>
  );
}