import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

const PaymentSuccess = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const timer = setTimeout(() => navigate('/'), 5000);
    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4" dir="rtl">
      <div className="text-center space-y-6 max-w-sm">
        <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto">
          <CheckCircle className="w-10 h-10 text-green-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">התשלום הצליח! 🎉</h1>
          <p className="text-muted-foreground mt-2">ההזמנה שלך התקבלה ואנחנו מתחילים להכין.</p>
        </div>
        <p className="text-xs text-muted-foreground">תועבר לדף הראשי בעוד 5 שניות...</p>
        <Button onClick={() => navigate('/')} className="w-full">חזור לתפריט</Button>
      </div>
    </div>
  );
};

export default PaymentSuccess;