import React from "react";

export default function Terms() {
  return (
    <div className="container max-w-screen-md mx-auto py-12 px-4 flex-1 prose prose-invert prose-primary">
      <h1>Terms of Use</h1>
      <p className="lead">Last updated: {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</p>
      
      <h2>1. Acceptance of Terms</h2>
      <p>By accessing and using CraftLand Hub, you agree to be bound by these Terms of Use. If you do not agree to these terms, please do not use our service.</p>

      <h2>2. User Content</h2>
      <p>When submitting map codes or other content to CraftLand Hub, you grant us a non-exclusive, worldwide, royalty-free license to display, reproduce, and distribute that content within our platform.</p>
      <p>You agree not to submit any content that is:</p>
      <ul>
        <li>Inappropriate, offensive, or violates Free Fire's community guidelines</li>
        <li>Spam or deceptive</li>
        <li>Contains malicious links or code</li>
        <li>Not actually related to Free Fire CraftLand maps</li>
      </ul>

      <h2>3. Moderation</h2>
      <p>We reserve the right to review, modify, or remove any submitted content at our discretion without prior notice. We may also ban users who repeatedly violate these terms.</p>

      <h2>4. Disclaimers</h2>
      <p>CraftLand Hub is an independent community platform and is not affiliated with, endorsed, or sponsored by Garena or Free Fire. All game-related assets and trademarks belong to their respective owners.</p>
      <p>We do not guarantee the uptime, availability, or accuracy of the maps listed on this site.</p>
    </div>
  );
}
