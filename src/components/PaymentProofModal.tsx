import React, { useState } from 'react';
import { motion } from 'motion/react';
import {
  X,
  CheckCircle2,
  Copy,
  Check,
  CreditCard,
  AlertCircle,
  Loader2,
  MessageSquare,
  ShieldCheck,
  ArrowRight,
  Phone,
} from 'lucide-react';
import { StudentProfile, User, submitPaymentProofApi, PaymentRequest } from '../lib/supabase';

interface PaymentProofModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User | null;
  studentProfile: StudentProfile | null;
  onSubmitted?: (newRequest: PaymentRequest) => void;
}

const PAYMENT_METHODS = [
  {
    id: 'JazzCash',
    name: 'JazzCash',
    number: '+92 305 8969050',
    title: 'Haseena Bibi',
    badge: 'Mobile Wallet',
    color: 'from-amber-500 to-red-600',
    border: 'border-amber-500/30 dark:border-amber-500/40',
    bgLight: 'bg-amber-500/5 dark:bg-amber-500/10',
  },
  {
    id: 'SadaPay',
    name: 'SadaPay',
    number: '+92 349 0744686',
    title: 'Raheela Ferdous',
    badge: 'Digital Bank',
    color: 'from-emerald-500 to-teal-600',
    border: 'border-emerald-500/30 dark:border-emerald-500/40',
    bgLight: 'bg-emerald-500/5 dark:bg-emerald-500/10',
  },
  {
    id: 'NayaPay',
    name: 'NayaPay',
    number: '+92 349 0744686',
    title: 'Raheela Ferdous',
    badge: 'Digital Bank',
    color: 'from-cyan-500 to-blue-600',
    border: 'border-cyan-500/30 dark:border-cyan-500/40',
    bgLight: 'bg-cyan-500/5 dark:bg-cyan-500/10',
  },
  {
    id: 'Easypaisa',
    name: 'Easypaisa',
    number: '+92 333 5292094',
    title: 'Sadia Fatima',
    badge: 'Mobile Wallet',
    color: 'from-green-500 to-emerald-700',
    border: 'border-green-500/30 dark:border-green-500/40',
    bgLight: 'bg-green-500/5 dark:bg-green-500/10',
  },
];

const PRICING_TIERS = [
  { id: 'Matric', title: 'Matric', subtitle: '9th & 10th Class', fee: '499', label: 'Matric (9th/10th)', desc: 'Full MCQ Bank & Past Papers' },
  { id: 'FSc', title: 'FSc', subtitle: '1st & 2nd Year', fee: '999', label: 'FSc (1st/2nd Year)', desc: 'Pre-Med & Engineering' },
  { id: 'MDCAT', title: 'MDCAT', subtitle: 'Medical Entry Test', fee: '1499', label: 'MDCAT Prep', desc: 'Complete MDCAT Prep' },
  { id: 'TCAT / ECAT', title: 'TCAT / ECAT', subtitle: 'Engineering Entry Test', fee: '1499', label: 'TCAT / ECAT', desc: 'ECAT Prep & Mocks' },
];

export const PaymentProofModal: React.FC<PaymentProofModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  studentProfile,
  onSubmitted,
}) => {
  const [selectedMethod, setSelectedMethod] = useState<string>('JazzCash');
  const [selectedTier, setSelectedTier] = useState<string>(() => {
    const grade = (studentProfile?.grade || '').toLowerCase();
    if (grade.includes('matric') || grade.includes('9th') || grade.includes('10th')) return 'Matric';
    if (grade.includes('fsc') || grade.includes('11th') || grade.includes('12th')) return 'FSc';
    if (grade.includes('mdcat') || grade.includes('medical')) return 'MDCAT';
    return 'TCAT / ECAT';
  });

  const [amount, setAmount] = useState<string>(() => {
    const grade = (studentProfile?.grade || '').toLowerCase();
    if (grade.includes('matric') || grade.includes('9th') || grade.includes('10th')) return '499';
    if (grade.includes('fsc') || grade.includes('11th') || grade.includes('12th')) return '999';
    return '1499';
  });

  const [fullName, setFullName] = useState<string>(() => {
    return studentProfile?.name || currentUser?.user_metadata?.full_name || '';
  });

  const [studentEmail, setStudentEmail] = useState<string>(() => {
    return currentUser?.email || studentProfile?.email || '';
  });

  const [paidFromPhone, setPaidFromPhone] = useState<string>(() => {
    return studentProfile?.phone || '';
  });

  const [transactionRef, setTransactionRef] = useState<string>('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState<boolean>(false);
  const [whatsappUrl, setWhatsappUrl] = useState<string>('');

  if (!isOpen) return null;

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleSelectTier = (tierId: string, fee: string) => {
    setSelectedTier(tierId);
    setAmount(fee);
    setError(null);
  };

  const generateWhatsappMessage = (name: string, email: string, method: string, phoneFrom: string, amt: string, tier: string, trx: string) => {
    const text =
`Hi, I have sent payment for Boardly Premium verification.

*Student Name:* ${name.trim()}
*Email:* ${email.trim()}
*Plan Selected:* ${tier}
*Account Paid To:* ${method}
*Paid From Phone:* ${phoneFrom.trim()}
*Amount Paid:* PKR ${amt.trim()}
*Transaction ID:* ${trx.trim()}

Please verify my payment and activate my account.`;
    return `https://wa.me/923222314436?text=${encodeURIComponent(text)}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const nameVal = fullName.trim() || studentProfile?.name || currentUser?.user_metadata?.full_name || 'Student';
    const resolvedEmail = (studentEmail || currentUser?.email || studentProfile?.email || '').trim();
    const phoneVal = paidFromPhone.trim();
    const trxVal = transactionRef.trim();

    if (!nameVal) {
      setError('Please enter your full name.');
      return;
    }

    if (!resolvedEmail || !/\S+@\S+\.\S+/.test(resolvedEmail)) {
      setError('Please enter a valid email address.');
      return;
    }

    if (!phoneVal) {
      setError('Please enter the phone number you paid FROM.');
      return;
    }

    if (!trxVal) {
      setError('Please enter your Transaction ID / Reference Number.');
      return;
    }

    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      setError('Please enter a valid payment amount.');
      return;
    }

    const studentId = currentUser?.id || studentProfile?.id || `anon-${Date.now()}`;
    setIsSubmitting(true);

    try {
      const payload = {
        student_id: studentId,
        student_name: nameVal,
        student_email: resolvedEmail,
        payment_method: selectedMethod,
        paid_from_phone: phoneVal,
        amount: amount,
        course_tier: selectedTier,
        tier: selectedTier,
        transaction_reference: trxVal,
      };

      const res = await submitPaymentProofApi(payload);

      const waUrl = generateWhatsappMessage(nameVal, resolvedEmail, selectedMethod, phoneVal, amount, selectedTier, trxVal);
      setWhatsappUrl(waUrl);

      // Open WhatsApp chat in a new tab immediately
      try {
        window.open(waUrl, '_blank');
      } catch (openErr) {
        console.warn('Could not auto-open WhatsApp link:', openErr);
      }

      setIsSuccess(true);
      if (res.success && res.data && onSubmitted) {
        onSubmitted(res.data);
      }
    } catch (err: any) {
      console.error('[PaymentProofModal] Submission error:', err);
      setError(err?.message || 'Error processing payment verification request.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        className="relative w-full max-w-2xl my-8 bg-white dark:bg-[#18181b] border border-slate-200 dark:border-zinc-800 rounded-3xl shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="relative p-6 bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 text-white">
          <button
            type="button"
            onClick={onClose}
            className="absolute top-5 right-5 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-3">
            <div className="p-3 bg-white/15 rounded-2xl backdrop-blur-md">
              <MessageSquare className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-extrabold tracking-tight">WhatsApp Payment Verification</h2>
              <p className="text-xs text-emerald-100/90 font-medium mt-0.5">
                Submit payment details & verify instantly with official WhatsApp support (+923222314436)
              </p>
            </div>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
          {!isSuccess ? (
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Error Banner */}
              {error && (
                <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs flex items-start gap-3">
                  <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                  <div className="font-semibold">{error}</div>
                </div>
              )}

              {/* 1. Pricing Tier Selection */}
              <div className="space-y-3">
                <label className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-zinc-400">
                  1. Select Plan / Tier
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {PRICING_TIERS.map((tier) => {
                    const isSelected = selectedTier === tier.id;
                    return (
                      <button
                        key={tier.id}
                        type="button"
                        onClick={() => handleSelectTier(tier.id, tier.fee)}
                        className={`p-3 rounded-2xl border text-left transition-all cursor-pointer relative ${
                          isSelected
                            ? 'bg-emerald-500/10 dark:bg-emerald-500/20 border-emerald-500 text-emerald-900 dark:text-emerald-100 ring-2 ring-emerald-500/30'
                            : 'bg-slate-50 dark:bg-zinc-900/60 border-slate-200 dark:border-zinc-800 text-slate-700 dark:text-zinc-300 hover:border-slate-300 dark:hover:border-zinc-700'
                        }`}
                      >
                        <div className="text-[11px] font-bold text-slate-500 dark:text-zinc-400">{tier.subtitle}</div>
                        <div className="text-sm font-black text-slate-900 dark:text-white mt-0.5">{tier.title}</div>
                        <div className="text-xs font-black text-emerald-600 dark:text-emerald-400 mt-1">
                          PKR {tier.fee}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 2. Official Payment Accounts */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-zinc-400">
                    2. Official Accounts — Send Payment Here
                  </label>
                  <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                    Amount: PKR {amount}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {PAYMENT_METHODS.map((method) => {
                    const isSelected = selectedMethod === method.id;
                    return (
                      <div
                        key={method.id}
                        onClick={() => setSelectedMethod(method.id)}
                        className={`p-3.5 rounded-2xl border transition-all cursor-pointer relative ${
                          isSelected
                            ? `${method.bgLight} ${method.border} ring-2 ring-emerald-500/30`
                            : 'bg-slate-50 dark:bg-zinc-900/50 border-slate-200 dark:border-zinc-800 hover:border-slate-300 dark:hover:border-zinc-700'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-xs font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                            <CreditCard className="w-3.5 h-3.5 text-emerald-500" />
                            {method.name}
                          </span>
                          <span className="text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-slate-200/70 dark:bg-zinc-800 text-slate-600 dark:text-zinc-300">
                            {method.badge}
                          </span>
                        </div>

                        <div className="text-xs font-mono font-bold text-slate-800 dark:text-zinc-200 flex items-center justify-between">
                          <span>{method.number}</span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCopy(method.number.replace(/\s+/g, ''), method.id);
                            }}
                            className="p-1 rounded-md bg-slate-200/60 dark:bg-zinc-800 hover:bg-emerald-500 hover:text-white transition-colors cursor-pointer text-slate-600 dark:text-zinc-300"
                            title="Copy Account Number"
                          >
                            {copiedId === method.id ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                        <div className="text-[10px] text-slate-500 dark:text-zinc-400 font-medium mt-1">
                          Account Title: <strong className="text-slate-700 dark:text-zinc-300 font-bold">{method.title}</strong>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* 3. Verification Details Form */}
              <div className="space-y-4 pt-2 border-t border-slate-100 dark:border-zinc-800">
                <label className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-zinc-400 block">
                  3. Your Payment Details
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-zinc-300 mb-1">
                      Full Name <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="e.g. Muhammad Ali"
                      className="w-full bg-slate-50 dark:bg-zinc-900 border border-slate-300 dark:border-zinc-800 focus:border-emerald-500 rounded-xl px-3.5 py-2 text-xs text-slate-900 dark:text-white outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-zinc-300 mb-1">
                      Email Address <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="email"
                      required
                      value={studentEmail}
                      onChange={(e) => setStudentEmail(e.target.value)}
                      placeholder="student@example.com"
                      className="w-full bg-slate-50 dark:bg-zinc-900 border border-slate-300 dark:border-zinc-800 focus:border-emerald-500 rounded-xl px-3.5 py-2 text-xs text-slate-900 dark:text-white outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-zinc-300 mb-1">
                      Phone Number Paid FROM <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="tel"
                      required
                      value={paidFromPhone}
                      onChange={(e) => setPaidFromPhone(e.target.value)}
                      placeholder="e.g. 03001234567"
                      className="w-full bg-slate-50 dark:bg-zinc-900 border border-slate-300 dark:border-zinc-800 focus:border-emerald-500 rounded-xl px-3.5 py-2 text-xs text-slate-900 dark:text-white outline-none font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-zinc-300 mb-1">
                      Transaction ID / Reference Number <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={transactionRef}
                      onChange={(e) => setTransactionRef(e.target.value)}
                      placeholder="e.g. TRX12345678"
                      className="w-full bg-slate-50 dark:bg-zinc-900 border border-slate-300 dark:border-zinc-800 focus:border-emerald-500 rounded-xl px-3.5 py-2 text-xs text-slate-900 dark:text-white outline-none font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Notice */}
              <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-4 text-xs space-y-1.5 text-emerald-800 dark:text-emerald-200">
                <div className="font-extrabold flex items-center gap-1.5 text-emerald-700 dark:text-emerald-300">
                  <ShieldCheck className="w-4 h-4 text-emerald-500" />
                  <span>Official WhatsApp Verification Channel: +923222314436</span>
                </div>
                <p className="text-[11px] text-slate-600 dark:text-zinc-300 leading-relaxed">
                  Tapping the button below records your submission in our database and opens WhatsApp with your payment details pre-filled. You can attach your payment screenshot directly in WhatsApp.
                </p>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-[#25D366] hover:bg-[#1eae50] text-white font-black py-3.5 px-6 rounded-full transition-all cursor-pointer text-xs sm:text-sm shadow-xl flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Opening WhatsApp Chat...</span>
                  </>
                ) : (
                  <>
                    <MessageSquare className="w-4 h-4" />
                    <span>Verify Payment on WhatsApp (+923222314436)</span>
                    <ArrowRight className="w-4 h-4 ml-auto" />
                  </>
                )}
              </button>
            </form>
          ) : (
            /* Success View */
            <div className="text-center py-6 space-y-6">
              <div className="w-16 h-16 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-500 flex items-center justify-center mx-auto shadow-lg">
                <CheckCircle2 className="w-10 h-10" />
              </div>

              <div className="space-y-2">
                <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20">
                  Submission Saved
                </span>
                <h3 className="text-2xl font-black text-slate-900 dark:text-white">
                  Payment Verification Request Sent!
                </h3>
                <p className="text-xs text-slate-600 dark:text-zinc-300 max-w-md mx-auto leading-relaxed">
                  Your payment details for <strong>{selectedTier}</strong> (Ref: <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">{transactionRef}</span>) have been logged.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-left text-xs space-y-1.5">
                <div className="font-extrabold text-slate-800 dark:text-zinc-200">
                  Verification Summary:
                </div>
                <div className="text-slate-600 dark:text-zinc-400 space-y-1 text-[11px]">
                  <div>• Student: <strong>{fullName}</strong> ({studentEmail})</div>
                  <div>• Account Paid To: <strong>{selectedMethod}</strong></div>
                  <div>• Sender Phone: <strong>{paidFromPhone}</strong></div>
                  <div>• Amount Paid: <strong>PKR {amount}</strong></div>
                  <div>• WhatsApp Contact: <strong>+923222314436</strong></div>
                </div>
              </div>

              <div className="space-y-2 pt-2">
                <a
                  href={whatsappUrl || generateWhatsappMessage(fullName, studentEmail, selectedMethod, paidFromPhone, amount, selectedTier, transactionRef)}
                  target="_blank"
                  rel="noreferrer"
                  className="w-full bg-[#25D366] hover:bg-[#1eae50] text-white font-black py-3.5 px-6 rounded-full text-xs sm:text-sm transition-all cursor-pointer shadow-lg flex items-center justify-center gap-2"
                >
                  <MessageSquare className="w-4 h-4" />
                  <span>Open WhatsApp Chat (+923222314436)</span>
                </a>

                <button
                  type="button"
                  onClick={onClose}
                  className="w-full bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-800 dark:text-white font-bold text-xs py-2.5 px-4 rounded-full transition-all cursor-pointer"
                >
                  Close Window
                </button>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};
