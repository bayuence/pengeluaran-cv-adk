import { ExpenseForm } from '@/components/ExpenseForm';
import { OfflineIndicator } from '@/components/OfflineIndicator';

export default function Home() {
  return (
    <main className="min-h-screen w-full">
      <OfflineIndicator />
      <div className="container mx-auto px-4 py-8">
        <ExpenseForm />
      </div>
    </main>
  );
}
