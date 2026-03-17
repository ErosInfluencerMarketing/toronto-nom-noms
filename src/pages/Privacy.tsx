const Privacy = () => {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-3xl mx-auto px-6 py-16">
        <h1 className="text-3xl font-bold mb-2">Privacy Policy</h1>
        <p className="text-muted-foreground mb-10">Last updated: March 17, 2026</p>

        <div className="space-y-8 text-sm leading-relaxed text-foreground/90">
          <section>
            <h2 className="text-lg font-semibold mb-3">1. Introduction</h2>
            <p>
              The Noms Company Inc. ("we", "our", "us") operates the Noms platform (the "Service").
              This Privacy Policy explains how we collect, use, store, and protect information when you
              use our Service, including data obtained through the Instagram Graph API and Meta Platform.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3">2. Information We Collect</h2>
            <p className="mb-2">When you connect your Instagram account to our Service, we may access:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Your Instagram profile information (username, bio, profile picture, media count)</li>
              <li>Follower and following counts</li>
              <li>Your published media (posts, reels, stories) and associated metrics (likes, comments)</li>
              <li>Account-level insights (impressions, reach, engagement)</li>
              <li>Tagged and mentioned media related to your account</li>
            </ul>
            <p className="mt-2">
              We only access data from accounts that have explicitly authorized our application through
              Meta's OAuth consent flow.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3">3. How We Use Your Data</h2>
            <p className="mb-2">We use the collected Instagram data to:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Display your account insights and performance metrics within our dashboard</li>
              <li>Calculate engagement rates and content performance analytics</li>
              <li>Help you manage influencer relationships and collaboration tracking</li>
              <li>Identify tagged content and collaboration opportunities</li>
            </ul>
            <p className="mt-2">
              We do <strong>not</strong> sell, rent, or share your Instagram data with third parties
              for advertising or marketing purposes.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3">4. Data Storage & Security</h2>
            <p>
              Your data is stored securely using industry-standard encryption and hosted on
              infrastructure with SOC 2 Type II compliance. Access tokens are stored as encrypted
              secrets and are never exposed in client-side code. We retain your data only for as long
              as your account is active and your Instagram connection is authorized.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3">5. Data Retention & Deletion</h2>
            <p className="mb-2">
              You may disconnect your Instagram account from our Service at any time. Upon disconnection:
            </p>
            <ul className="list-disc pl-6 space-y-1">
              <li>We will stop accessing your Instagram data immediately</li>
              <li>All cached Instagram data will be deleted within 30 days</li>
              <li>Access tokens will be revoked and permanently deleted</li>
            </ul>
            <p className="mt-2">
              To request complete deletion of your data, contact us at{" "}
              <a href="mailto:hello@nomspass.com" className="text-primary underline">hello@nomspass.com</a>.
              We will process deletion requests within 15 business days.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3">6. Meta Platform Terms</h2>
            <p>
              Our use of Instagram data is governed by the{" "}
              <a
                href="https://developers.facebook.com/terms/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary underline"
              >
                Meta Platform Terms
              </a>{" "}
              and{" "}
              <a
                href="https://developers.facebook.com/devpolicy/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary underline"
              >
                Developer Policies
              </a>
              . We comply with all applicable Meta data usage requirements, including but not limited to:
            </p>
            <ul className="list-disc pl-6 space-y-1 mt-2">
              <li>Only requesting permissions necessary for our stated functionality</li>
              <li>Providing clear notice of data collection and usage</li>
              <li>Honoring user data deletion requests promptly</li>
              <li>Not transferring data to data brokers or advertising networks</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3">7. Your Rights</h2>
            <p className="mb-2">You have the right to:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Access the Instagram data we have stored about you</li>
              <li>Request correction of inaccurate data</li>
              <li>Request deletion of your data at any time</li>
              <li>Revoke our access to your Instagram account</li>
              <li>Export your data in a portable format</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3">8. Cookies & Tracking</h2>
            <p>
              Our Service uses essential cookies for authentication and session management. We do not
              use third-party tracking cookies or share browsing data with advertisers.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3">9. Changes to This Policy</h2>
            <p>
              We may update this Privacy Policy from time to time. We will notify you of any material
              changes by posting the updated policy on this page with a revised "Last updated" date.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3">10. Contact Us</h2>
            <p>
              If you have any questions about this Privacy Policy or our data practices, please contact us at:
            </p>
            <p className="mt-2">
              <strong>The Noms Company Inc.</strong><br />
              Email:{" "}
              <a href="mailto:hello@nomspass.com" className="text-primary underline">hello@nomspass.com</a><br />
              Website:{" "}
              <a href="https://toronto-nom-noms.lovable.app" className="text-primary underline">toronto-nom-noms.lovable.app</a>
            </p>
          </section>
        </div>
      </div>
    </div>
  );
};

export default Privacy;
