const fs = require('fs');
const path = require('path');

const files = ['en.json', 'fr.json', 'de.json', 'es.json', 'it.json'].map((f) => path.join('messages', f));

const additions = {
  heroBadge: 'Trusted by 10,000+ Legal Professionals Worldwide',
  heroUsers: '10,000+ users',
  heroRating: '4.9/5 rating',
  heroSecurity: 'SOC 2 Certified',
  feature1Details: 'Generate comprehensive legal documents with AI-powered templates and clause libraries',
  feature2Details: 'Accurate time tracking, expense management, and automated invoicing',
  feature3Details: 'Centralized document storage with version control and secure sharing',
  feature4Details: 'Complete case lifecycle management with automated workflows',
  stats: {
    activeUsers: 'Active Users',
    documentsCreated: 'Documents Created',
    uptime: 'Uptime',
    support: 'Support',
  },
  capabilities: {
    title: 'Comprehensive Legal Technology Suite',
    subtitle: 'Everything you need, all in one place. No more juggling multiple tools and subscriptions.',
    documentManagement: {
      category: 'Document Management',
      items: {
        aiDocGen: 'AI-Powered Document Generation',
        templates: 'Template Library (500+ Templates)',
        versioning: 'Version Control & History',
        esignature: 'E-Signature Integration',
      },
    },
    caseManagement: {
      category: 'Case Management',
      items: {
        tracking: 'Matter Tracking & Organization',
        deadlines: 'Deadline & Task Management',
        reminders: 'Court Date Reminders',
        conflictChecks: 'Conflict Checking',
      },
    },
    financialTools: {
      category: 'Financial Tools',
      items: {
        timeBilling: 'Time Tracking & Billing',
        expenses: 'Expense Management',
        invoices: 'Invoice Generation',
        payments: 'Payment Processing',
      },
    },
    communication: {
      category: 'Communication',
      items: {
        clientPortal: 'Client Portal',
        secureMessaging: 'Secure Messaging',
        emailIntegration: 'Email Integration',
        videoConferencing: 'Video Conferencing',
      },
    },
  },
  useCases: {
    title: 'Built For Every Legal Professional',
    subtitle: "Whether you're a solo practitioner or part of a large firm, we have the right solution for you.",
    solo: {
      title: 'Solo Practitioners',
      description: 'Everything you need to run your practice independently',
      f1: 'Document automation',
      f2: 'Client management',
      f3: 'Time tracking',
      f4: 'Mobile access',
    },
    smallFirms: {
      title: 'Small Law Firms',
      description: 'Collaborate seamlessly with your team',
      f1: 'Team workflows',
      f2: 'Matter sharing',
      f3: 'Centralized billing',
      f4: 'Role-based access',
    },
    corporate: {
      title: 'Corporate Legal',
      description: 'Enterprise-grade tools for in-house counsel',
      f1: 'Contract management',
      f2: 'Compliance tracking',
      f3: 'Custom integrations',
      f4: 'Advanced security',
    },
    clinics: {
      title: 'Legal Clinics',
      description: 'Manage pro bono and community cases efficiently',
      f1: 'Case intake',
      f2: 'Client screening',
      f3: 'Volunteer coordination',
      f4: 'Impact reporting',
    },
  },
  benefits: {
    title: 'Why Choose LYNVIA DIGITAL',
    subtitle: 'Built by legal professionals for legal professionals. Experience the difference of a platform designed with your workflow in mind.',
    saveTime: {
      title: 'Save Time',
      description: 'Automate repetitive legal tasks and reduce manual document preparation time by up to 70%.',
      stat: '70% faster',
    },
    secure: {
      title: 'Secure & Compliant',
      description: 'Bank-level encryption and full compliance with legal industry standards and regulations.',
      stat: '100% secure',
    },
    clientManagement: {
      title: 'Client Management',
      description: 'Manage all client information, cases, and communications from one centralized platform.',
      stat: '10k+ clients',
    },
    businessGrowth: {
      title: 'Business Growth',
      description: 'Scale your practice efficiently with tools designed to grow alongside your firm.',
      stat: '2x revenue',
    },
  },
  steps: {
    title: 'Get Started in Minutes',
    subtitle: 'Our streamlined onboarding process gets you up and running quickly, so you can focus on what matters most.',
    signUp: {
      title: 'Sign Up',
      description: 'Create your account in under 2 minutes with our simple registration process',
    },
    setup: {
      title: 'Set Up',
      description: 'Customize your workspace and configure preferences to match your workflow',
    },
    startWorking: {
      title: 'Start Working',
      description: 'Begin managing cases, generating documents, and tracking time immediately',
    },
    growScale: {
      title: 'Grow & Scale',
      description: 'Use powerful analytics and insights to optimize and expand your practice',
    },
  },
  testimonials: {
    title: 'Loved by Legal Professionals',
    subtitle: "Don't just take our word for it. Here's what our users have to say about LYNVIA DIGITAL.",
    sarah: {
      role: 'Partner, Johnson & Associates',
      content: 'LYNVIA DIGITAL has transformed how we run our practice. Document automation alone saves us 15 hours per week.',
    },
    michael: {
      role: 'Solo Practitioner',
      content: 'As a solo attorney, this platform gives me the tools of a large firm at a fraction of the cost. Game changer!',
    },
    david: {
      role: 'Managing Partner, Williams Legal Group',
      content: 'The case management features are outstanding. Our team collaboration has never been better.',
    },
    emily: {
      role: 'Associate Attorney',
      content: "Intuitive interface and powerful features. It's made my daily workflow so much more efficient.",
    },
  },
  integrations: {
    title: 'Seamless Integrations',
    subtitle: 'Connect with the tools you already use. LYNVIA DIGITAL integrates with your favorite apps and services.',
  },
  faq: {
    title: 'Frequently Asked Questions',
    subtitle: "Have questions? We've got answers. Can't find what you're looking for? Contact our support team.",
    q1: {
      question: 'How long does it take to get started?',
      answer: 'You can create an account and start using LYNVIA DIGITAL in less than 5 minutes. Our intuitive onboarding process guides you through setup.',
    },
    q2: {
      question: 'Is my data secure?',
      answer: 'Absolutely. We use bank-level 256-bit encryption, regular security audits, and comply with all major legal industry standards including SOC 2 Type II.',
    },
    q3: {
      question: 'Can I import my existing data?',
      answer: 'Yes! We support data import from most practice management systems. Our team can help with migration at no extra cost.',
    },
    q4: {
      question: 'What kind of support do you offer?',
      answer: 'We provide email support for all plans, with priority support for Professional and Enterprise tiers. Enterprise customers get a dedicated account manager.',
    },
    q5: {
      question: 'Can I cancel anytime?',
      answer: "Yes, you can cancel your subscription at any time with no penalties. You'll retain access until the end of your billing period.",
    },
    q6: {
      question: 'Do you offer training?',
      answer: 'We provide comprehensive documentation, video tutorials, and webinars. Enterprise customers receive personalized onboarding and training sessions.',
    },
  },
  cta: {
    badge: 'Start Your Free Trial Today',
    title: 'Ready to Transform Your Practice?',
    description: 'Join thousands of legal professionals who have already streamlined their workflow with LYNVIA DIGITAL. Start your free 30-day trial today-no credit card required.',
    startTrial: 'Start Free Trial',
    watchDemo: 'Watch Demo',
    bulletTrial: '30-day free trial',
    bulletNoCard: 'No credit card required',
    bulletCancel: 'Cancel anytime',
  },
  footerDescription: 'The all-in-one practice management platform for modern legal professionals.',
  footer: {
    product: {
      title: 'Product',
      features: 'Features',
      pricing: 'Pricing',
      integrations: 'Integrations',
      security: 'Security',
    },
    resources: {
      title: 'Resources',
      documentation: 'Documentation',
      helpCenter: 'Help Center',
      blog: 'Blog',
      webinars: 'Webinars',
    },
    company: {
      title: 'Company',
      about: 'About Us',
      careers: 'Careers',
      contact: 'Contact',
      partners: 'Partners',
    },
    cookies: 'Cookies',
  },
};

function deepMerge(target, source) {
  Object.keys(source).forEach((key) => {
    const sourceValue = source[key];
    if (sourceValue && typeof sourceValue === 'object' && !Array.isArray(sourceValue)) {
      if (!target[key] || typeof target[key] !== 'object' || Array.isArray(target[key])) {
        target[key] = {};
      }
      deepMerge(target[key], sourceValue);
    } else if (target[key] === undefined) {
      target[key] = sourceValue;
    }
  });
}

files.forEach((file) => {
  const raw = fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, '');
  const json = JSON.parse(raw);
  if (!json.HomePage) json.HomePage = {};
  deepMerge(json.HomePage, additions);
  fs.writeFileSync(file, JSON.stringify(json, null, 2) + '\n', 'utf8');
  console.log(`Updated ${file}`);
});
