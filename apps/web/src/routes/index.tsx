import { createFileRoute } from '@tanstack/react-router'
import { NorteLandingPage } from '../components/NorteLandingPage'

export const Route = createFileRoute('/')({
  head: () => ({
    meta: [
      { title: 'Norte | Your financial north, before the decision' },
      { name: 'description', content: 'Norte is a coming-soon finance app that helps people connect everyday financial decisions with long-term goals before they spend.' },
      { name: 'theme-color', content: '#3a6e54' },
      { property: 'og:type', content: 'website' },
      { property: 'og:title', content: 'Norte | Your financial north' },
      { property: 'og:description', content: "A finance app for seeing whether today's choices move you closer to the future you want. Coming soon." },
      { name: 'twitter:card', content: 'summary' },
      { name: 'twitter:title', content: 'Norte | Your financial north' },
      { name: 'twitter:description', content: 'Plan goals, preview decisions, and see your financial roadmap. Coming soon.' },
    ],
    scripts: [{ type: 'application/ld+json', children: JSON.stringify({ '@context': 'https://schema.org', '@type': 'SoftwareApplication', name: 'Norte', applicationCategory: 'FinanceApplication', operatingSystem: 'Web, iOS, Android', description: 'Norte is a coming-soon finance app that helps people understand whether daily financial decisions move them closer to or farther from their goals.', offers: { '@type': 'Offer', availability: 'https://schema.org/PreOrder', price: '0', priceCurrency: 'USD' } }) }],
  }),
  component: NorteLandingPage,
})
