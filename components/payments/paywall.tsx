/**
 * Stub component for paywall
 * TODO: Implement paywall when payment system is integrated
 */
interface PaywallProps {
  children?: React.ReactNode;
  [key: string]: any;
}

export function Paywall({ children, ...props }: PaywallProps) {
  return <>{children}</>;
}
