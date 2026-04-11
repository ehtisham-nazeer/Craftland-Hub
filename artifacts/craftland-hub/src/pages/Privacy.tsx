import React from "react";

export default function Privacy() {
  return (
    <div className="container max-w-screen-md mx-auto py-12 px-4 flex-1 prose prose-invert prose-primary">
      <h1>Privacy Policy</h1>
      <p className="lead">Last updated: {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</p>
      
      <h2>Information We Collect</h2>
      <p>When you use CraftLand Hub, we may collect the following types of information:</p>
      <ul>
        <li><strong>Account Information:</strong> If you sign in, we collect basic profile data (name, email) provided by our authentication provider (Clerk).</li>
        <li><strong>User Activity:</strong> We track likes, bookmarks, and submissions to provide personalized features.</li>
        <li><strong>Usage Data:</strong> We may collect anonymous analytics data regarding how you navigate the site to improve user experience.</li>
      </ul>

      <h2>How We Use Your Information</h2>
      <p>We use the collected information to:</p>
      <ul>
        <li>Provide, maintain, and improve our services</li>
        <li>Process map submissions and moderate content</li>
        <li>Personalize your experience (e.g., showing your saved maps)</li>
        <li>Communicate with you regarding your account or submissions</li>
      </ul>

      <h2>Data Sharing</h2>
      <p>We do not sell, trade, or rent your personal identification information to others. We may share generic aggregated demographic information not linked to any personal identification information.</p>

      <h2>Third-Party Services</h2>
      <p>We use Clerk for authentication. Please refer to their privacy policy for details on how they handle your data during the sign-in process.</p>
    </div>
  );
}
