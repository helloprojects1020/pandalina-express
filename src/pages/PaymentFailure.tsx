import { useNavigate } from 'react-router-dom';
import { XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

const PaymentFailure = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4" dir="rtl">
      <div className="text-center space-y-6 max-w-sm">
        <div className="w-20 h-20 rounded-full bg-red-100 flex items-center justify-center mx-auto">
          <XCircle className="w-10 h-10 text-red-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">התשלום נכשל</h1>
          <p className="text-muted-foreground mt-2">משהו השתבש. אנא נסה שנית או צור קשר.</p>
        </div>
        <div className="space-y-2">
          <Button onClick={() => navigate(-1)} className="w-full">נסה שנית</Button>
          <Button variant="outline" onClick={() => navigate('/')} className="w-full">חזור לתפריט</Button>
        </div>
      </div>
    </div>
  );
};

export default PaymentFailure;