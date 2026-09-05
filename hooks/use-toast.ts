export function useToast() {
  return {
    toast: (props: { title: string; description?: string; variant?: 'default' | 'destructive' }) => {
      console.log(`[Toast ${props.variant || 'default'}]: ${props.title} - ${props.description}`);
      alert(`${props.title}\n${props.description || ''}`);
    }
  };
}
