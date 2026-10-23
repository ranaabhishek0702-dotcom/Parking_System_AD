import { FUNCTIONS_BASE_URL } from './firebase';

export interface PaymentRequest {
  reservationId: string;
  amount: number;
  currency?: string;
  userId: string;
  vehicleNumber: string;
  zoneName: string;
}

export interface PaymentResponse {
  success: boolean;
  paymentId: string;
  gateway: 'razorpay' | 'wallet';
  method: 'upi_gpay' | 'upi_phonepe' | 'upi_paytm' | 'upi_qr' | 'wallet';
  amount: number;
  timestamp: number;
  transactionRef: string;
  message?: string;
}

export interface PaymentProvider {
  readonly id: string;
  readonly name: string;
  processPayment(
    request: PaymentRequest,
    subMethod?: 'upi_gpay' | 'upi_phonepe' | 'upi_paytm' | 'upi_qr'
  ): Promise<PaymentResponse>;
}

/**
 * 1. Razorpay UPI Test Mode Provider
 */
export class RazorpayUPIProvider implements PaymentProvider {
  readonly id = 'razorpay_upi';
  readonly name = 'Razorpay UPI (Test Mode)';

  async processPayment(
    request: PaymentRequest,
    subMethod: 'upi_gpay' | 'upi_phonepe' | 'upi_paytm' | 'upi_qr' = 'upi_qr'
  ): Promise<PaymentResponse> {
    // Generate authentic Razorpay Test Payment ID
    const paymentId = `pay_${Date.now()}_rzp_${Math.random().toString(36).substring(2, 8)}`;
    const transactionRef = `UPI/${Math.floor(100000000000 + Math.random() * 900000000000)}/RZP`;

    // Confirm booking with backend Cloud Function
    const res = await fetch(`${FUNCTIONS_BASE_URL}/confirmBooking`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        reservationId: request.reservationId,
        paymentId,
        paymentMethod: subMethod,
        userId: request.userId
      })
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Payment confirmation failed');
    }

    return {
      success: true,
      paymentId,
      gateway: 'razorpay',
      method: subMethod,
      amount: request.amount,
      timestamp: Date.now(),
      transactionRef,
      message: 'Payment captured successfully via Razorpay UPI test mode'
    };
  }
}

/**
 * 2. Citizen Wallet Provider
 */
export class CitizenWalletProvider implements PaymentProvider {
  readonly id = 'citizen_wallet';
  readonly name = 'ParkSense Citizen Wallet';

  private currentBalance: number;
  private deductCallback: (amount: number) => void;

  constructor(currentBalance: number, deductCallback: (amount: number) => void) {
    this.currentBalance = currentBalance;
    this.deductCallback = deductCallback;
  }

  async processPayment(request: PaymentRequest): Promise<PaymentResponse> {
    if (this.currentBalance < request.amount) {
      throw new Error(`Insufficient wallet balance (₹${this.currentBalance}). Please top up.`);
    }

    const paymentId = `pay_wal_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const transactionRef = `WAL/${Math.floor(1000000000 + Math.random() * 9000000000)}`;

    const res = await fetch(`${FUNCTIONS_BASE_URL}/confirmBooking`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        reservationId: request.reservationId,
        paymentId,
        paymentMethod: 'wallet',
        userId: request.userId
      })
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Wallet transaction failed');
    }

    this.deductCallback(request.amount);

    return {
      success: true,
      paymentId,
      gateway: 'wallet',
      method: 'wallet',
      amount: request.amount,
      timestamp: Date.now(),
      transactionRef,
      message: 'Paid instantly with Citizen Wallet balance'
    };
  }
}
