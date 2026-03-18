import { useState, useCallback, useRef } from 'react';
import { GoogleMap, useJsApiLoader, MarkerF, InfoWindowF } from '@react-google-maps/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, Coffee, MapPin, Search, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

const SYDNEY_CENTER = { lat: -33.8688, lng: 151.2093 };
const MAP_CONTAINER = { width: '100%', height: '100%' };
const LIBRARIES: ('places')[] = ['places'];

interface CafePlace {
  placeId: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  rating?: number;
  totalRatings?: number;
  openNow?: boolean;
  iconUrl?: string;
  photoUrl?: string;
}

interface CafeMapInnerProps {
  apiKey: string;
}

export default function CafeMapInner({ apiKey }: CafeMapInnerProps) {
  const navigate = useNavigate();
  const [cafes, setCafes] = useState<CafePlace[]>([]);
  const [selectedCafe, setSelectedCafe] = useState<CafePlace | null>(null);
  const [searching, setSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const mapRef = useRef<google.maps.Map | null>(null);
  const serviceRef = useRef<google.maps.places.PlacesService | null>(null);

  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: apiKey,
    libraries: LIBRARIES,
  });

  const searchCafes = useCallback((map?: google.maps.Map) => {
    const currentMap = map || mapRef.current;
    const service = serviceRef.current;
    if (!currentMap || !service) return;

    setSearching(true);
    setSelectedCafe(null);

    const request: google.maps.places.TextSearchRequest = {
      query: searchQuery ? `${searchQuery} cafe in Sydney` : 'cafes in Sydney',
      location: currentMap.getCenter() || SYDNEY_CENTER,
      radius: 5000,
      type: 'cafe',
    };

    const allResults: google.maps.places.PlaceResult[] = [];

    const handlePage = (results: google.maps.places.PlaceResult[] | null, status: google.maps.places.PlacesServiceStatus, pagination: google.maps.places.PlaceSearchPagination | null) => {
      if (status === google.maps.places.PlacesServiceStatus.OK && results) {
        allResults.push(...results);
        if (pagination && pagination.hasNextPage) {
          setTimeout(() => pagination.nextPage(), 300);
        } else {
          finalize(allResults);
        }
      } else if (allResults.length > 0) {
        finalize(allResults);
      } else {
        setSearching(false);
        toast.error('No cafes found. Try a different search.');
        setCafes([]);
      }
    };

    const finalize = (results: google.maps.places.PlaceResult[]) => {
      const mapped: CafePlace[] = results.map((r) => {
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
          iconUrl: r.icon,
          photoUrl,
        };
      });
      setCafes(mapped);
      setSearching(false);
      toast.success(`Found ${mapped.length} cafes`);
    };

    service.textSearch(request, handlePage);
  }, [searchQuery]);

  const onMapLoad = useCallback((map: google.maps.Map) => {
    mapRef.current = map;
    serviceRef.current = new google.maps.places.PlacesService(map);
    searchCafes(map);
  }, [searchCafes]);

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
      <div className="border-b border-border bg-card px-4 py-3 flex items-center gap-3">
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
        </div>

        <span className="text-sm text-muted-foreground hidden sm:block">
          {cafes.length} result{cafes.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Map */}
      <div className="flex-1 relative">
        <GoogleMap
          mapContainerStyle={MAP_CONTAINER}
          center={SYDNEY_CENTER}
          zoom={13}
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
          {cafes.map((cafe) => (
            <MarkerF
              key={cafe.placeId}
              position={{ lat: cafe.lat, lng: cafe.lng }}
              onClick={() => setSelectedCafe(cafe)}
              icon={{
                url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(
                  `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="%2314b8a6" stroke="%230f172a" stroke-width="1.5"><path d="M17 8h1a4 4 0 1 1 0 8h-1"/><path d="M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4Z"/><line x1="6" x2="6" y1="2" y2="4"/><line x1="10" x2="10" y1="2" y2="4"/><line x1="14" x2="14" y1="2" y2="4"/></svg>`
                ),
                scaledSize: new google.maps.Size(36, 36),
              }}
            />
          ))}

          {selectedCafe && (
            <InfoWindowF
              position={{ lat: selectedCafe.lat, lng: selectedCafe.lng }}
              onCloseClick={() => setSelectedCafe(null)}
            >
              <div className="p-1 max-w-[220px]" style={{ color: '#1a1a2e' }}>
                <h3 className="font-semibold text-sm mb-1">{selectedCafe.name}</h3>
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
              </div>
            </InfoWindowF>
          )}
        </GoogleMap>
      </div>
    </div>
  );
}
