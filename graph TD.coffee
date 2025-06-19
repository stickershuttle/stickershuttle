graph TD
    A[Calculator Component] -->|Creates selections object| B[Cart Context]
    B -->|Saves to localStorage| C[LocalStorage]
    C -->|Loads on checkout| D[useStripeCheckout Hook]
    D -->|Sends via GraphQL| E[Apollo API]
    E -->|Creates order| F[Supabase DB]
    E -->|Creates session| G[Stripe Checkout]
    G -->|Webhook on success| H[Webhook Handler]
    H -->|Updates order| F
    
    style A fill:#9333ea,stroke:#7c3aed,color:#fff
    style B fill:#3b82f6,stroke:#2563eb,color:#fff
    style C fill:#f59e0b,stroke:#d97706,color:#fff
    style D fill:#10b981,stroke:#059669,color:#fff
    style E fill:#ef4444,stroke:#dc2626,color:#fff
    style F fill:#6366f1,stroke:#4f46e5,color:#fff
    style G fill:#8b5cf6,stroke:#7c3aed,color:#fff
    style H fill:#ec4899,stroke:#db2777,color:#fff