import InfoPageLayout from '@/components/InfoPageLayout'

export default function CookiesPage() {
  return (
    <InfoPageLayout 
      title="Cookie Policy" 
      subtitle="How we use cookies to improve your registration experience."
    >
      <section>
        <h2>What are Cookies?</h2>
        <p>
          Cookies are small text files stored on your device that help us provide a smoother experience. They allow us to remember your login state, your progress in a registration form, and your preferences.
        </p>
      </section>

      <section>
        <h2>Types of Cookies We Use</h2>
        <ul>
          <li><strong>Essential Cookies:</strong> Necessary for the platform to function (e.g., authentication, security).</li>
          <li><strong>Functional Cookies:</strong> Remember your preferences (e.g., language, form progress).</li>
          <li><strong>Analytical Cookies:</strong> Help us understand how users use the platform so we can improve it. These are anonymized.</li>
        </ul>
      </section>

      <section>
        <h2>Managing Cookies</h2>
        <p>
          Most browsers allow you to control cookies through their settings. However, disabling essential cookies may prevent you from using key features of GrayDocket, such as submitting an application.
        </p>
      </section>
    </InfoPageLayout>
  )
}
