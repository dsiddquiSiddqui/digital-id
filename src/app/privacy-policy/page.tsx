export const metadata = {
  title: "Privacy Policy | SGC ID ME",
  description: "Privacy Policy for the SGC ID ME mobile application.",
};

export default function PrivacyPolicyPage() {
  return (
    <main className="min-h-screen bg-white text-gray-900 px-6 py-12">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold mb-6">Privacy Policy</h1>

        <p className="mb-4">
          <strong>Effective Date:</strong> 01 June 2026
        </p>

        <p className="mb-6">
          SGC ID ME is an internal staff digital ID application designed for
          authorised users of SGC. This Privacy Policy explains how we collect,
          use, and protect information when users access and use the app.
        </p>

        <h2 className="text-2xl font-semibold mt-8 mb-3">
          Information We Collect
        </h2>

        <p className="mb-4">
          We may collect the following information from authorised users:
        </p>

        <ul className="list-disc pl-6 mb-6 space-y-2">
          <li>Name</li>
          <li>Email address</li>
          <li>Staff ID or employee information</li>
          <li>Profile photo or ID photo</li>
          <li>Login credentials</li>
          <li>Device information required for app functionality</li>
        </ul>

        <h2 className="text-2xl font-semibold mt-8 mb-3">
          How We Use Information
        </h2>

        <p className="mb-6">
          We use the information to create and manage staff digital ID profiles,
          allow authorised login, display staff identity information, manage
          internal users, and support the security and administration of the app.
        </p>

        <h2 className="text-2xl font-semibold mt-8 mb-3">
          Photo and Camera Access
        </h2>

        <p className="mb-6">
          The app may request access to the camera or photo library only when an
          authorised user needs to upload or update a staff profile or ID photo.
          This is part of the app’s core purpose, which is staff digital identity
          management. The app does not access photos or videos in the background
          and does not use media files for advertising, tracking, or unrelated
          purposes.
        </p>

        <h2 className="text-2xl font-semibold mt-8 mb-3">Data Sharing</h2>

        <p className="mb-6">
          We do not sell user data. User information is used only for internal
          staff identity and account management purposes. Data may only be
          accessed by authorised administrators of the organisation.
        </p>

        <h2 className="text-2xl font-semibold mt-8 mb-3">Data Security</h2>

        <p className="mb-6">
          We take reasonable steps to protect user information and restrict
          access to authorised users and administrators. However, no method of
          electronic storage or transmission is completely secure.
        </p>

        <h2 className="text-2xl font-semibold mt-8 mb-3">Account Access</h2>

        <p className="mb-6">
          Accounts are created and managed internally by the organisation or
          admin team. The app is not open for public registration. Users receive
          access only after being approved by the organisation.
        </p>

        <h2 className="text-2xl font-semibold mt-8 mb-3">Data Retention</h2>

        <p className="mb-6">
          We retain user information for as long as needed to provide staff ID
          and account management services, or as required by the organisation.
          When information is no longer required, it may be removed or deleted by
          the authorised admin team.
        </p>

        <h2 className="text-2xl font-semibold mt-8 mb-3">Children’s Privacy</h2>

        <p className="mb-6">
          This app is intended for authorised staff and organisational users. It
          is not intended for children or general public users.
        </p>

        <h2 className="text-2xl font-semibold mt-8 mb-3">
          Changes to This Privacy Policy
        </h2>

        <p className="mb-6">
          We may update this Privacy Policy from time to time. Any updates will
          be posted on this page with an updated effective date.
        </p>

        <h2 className="text-2xl font-semibold mt-8 mb-3">Contact Us</h2>

        <p className="mb-2">
          If you have any questions about this Privacy Policy, you can contact
          us at:
        </p>

        <p className="font-medium">Email: operations@sgcsecurityservices.co.uk</p>
      </div>
    </main>
  );
}