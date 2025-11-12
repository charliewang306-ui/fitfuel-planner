// TypeScript declaration for Stripe Pricing Table custom element
declare module 'react' {
  namespace JSX {
    interface IntrinsicElements {
      'stripe-pricing-table': React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement>,
        HTMLElement
      > & {
        'pricing-table-id'?: string;
        'publishable-key'?: string;
        'client-reference-id'?: string;
        'customer-session-client-secret'?: string;
      };
    }
  }
}

export {};
