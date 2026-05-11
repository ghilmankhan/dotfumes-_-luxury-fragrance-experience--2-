import { FormEvent, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Minus, Plus, Trash2 } from 'lucide-react';
import { useCartStore } from '../store/useCartStore';
import { useToastStore } from '../store/useToastStore';
import { AssetImage } from '../components/AssetImage';

export const CheckoutPage = () => {
  const { items, total, updateQuantity, removeItem, clearCart } = useCartStore();
  const { pushToast } = useToastStore();
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submitOrder = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (items.length === 0) {
      pushToast('Your selection is empty.', 'error');
      return;
    }

    setIsSubmitting(true);
    window.setTimeout(() => {
      clearCart();
      setIsSubmitting(false);
      pushToast('Your private consultation request was received.', 'success');
      navigate('/collection');
    }, 700);
  };

  return (
    <section className="min-h-screen bg-brand-white px-6 pb-24 pt-36 text-brand-black md:px-16 md:pt-44 lg:px-24">
      <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-[minmax(0,1fr)_420px]">
        <form onSubmit={submitOrder} className="order-2 lg:order-1">
          <span className="text-[10px] font-bold uppercase tracking-[0.5em] text-brand-gold">
            Checkout
          </span>
          <h1 className="mt-7 font-serif text-6xl italic leading-[0.9] tracking-tight md:text-8xl">
            Complete <br />
            <span className="text-neutral-300">Selection.</span>
          </h1>

          <div className="mt-14 grid gap-5 md:grid-cols-2">
            <CheckoutInput label="First name" name="firstName" autoComplete="given-name" />
            <CheckoutInput label="Last name" name="lastName" autoComplete="family-name" />
            <CheckoutInput label="Email" name="email" type="email" autoComplete="email" />
            <CheckoutInput label="Phone" name="phone" type="tel" autoComplete="tel" />
            <div className="md:col-span-2">
              <CheckoutInput
                label="Delivery address"
                name="address"
                autoComplete="street-address"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting || items.length === 0}
            className="mt-10 w-full bg-brand-black px-8 py-5 text-[10px] font-bold uppercase tracking-[0.35em] text-white transition-colors hover:bg-neutral-800 disabled:cursor-not-allowed disabled:bg-neutral-300 disabled:text-neutral-500"
          >
            {isSubmitting ? 'Securing Selection' : 'Place Consultation Order'}
          </button>
        </form>

        <aside className="order-1 h-fit border border-black/10 bg-white p-6 shadow-[0_28px_80px_rgba(0,0,0,0.05)] lg:order-2">
          <h2 className="font-serif text-3xl italic">Your Selection</h2>
          <div className="mt-8 space-y-6">
            {items.length === 0 ? (
              <div className="py-14 text-center">
                <p className="text-[10px] uppercase tracking-[0.32em] text-black/35">
                  Your selection is empty.
                </p>
                <Link
                  to="/collection"
                  className="mt-7 inline-flex border-b border-black/20 pb-1 text-[10px] uppercase tracking-[0.3em]"
                >
                  Explore Collection
                </Link>
              </div>
            ) : (
              items.map((item) => (
                <div key={item.id} className="flex gap-5 border-b border-black/5 pb-6">
                  <AssetImage
                    src={item.images.front}
                    alt={item.name}
                    wrapperClassName="h-28 w-20 shrink-0 bg-neutral-50"
                    className="h-full w-full object-contain"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-serif text-xl italic">{item.name}</p>
                        <p className="mt-2 text-[9px] uppercase tracking-[0.25em] text-black/35">
                          ${item.price}.00
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeItem(item.id)}
                        className="p-1 text-black/30 transition-colors hover:text-red-500"
                        aria-label={`Remove ${item.name}`}
                      >
                        <Trash2 size={15} strokeWidth={1.4} />
                      </button>
                    </div>

                    <div className="mt-5 flex w-fit items-center border border-black/10">
                      <button
                        type="button"
                        onClick={() => updateQuantity(item.id, item.quantity - 1)}
                        className="p-2"
                        aria-label={`Decrease ${item.name}`}
                      >
                        <Minus size={12} strokeWidth={1.4} />
                      </button>
                      <span className="w-8 text-center text-xs">{item.quantity}</span>
                      <button
                        type="button"
                        onClick={() => updateQuantity(item.id, item.quantity + 1)}
                        className="p-2"
                        aria-label={`Increase ${item.name}`}
                      >
                        <Plus size={12} strokeWidth={1.4} />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="mt-8 flex items-end justify-between border-t border-black/10 pt-6">
            <span className="text-[10px] uppercase tracking-[0.35em] text-black/35">Subtotal</span>
            <span className="font-serif text-3xl italic">${total()}.00</span>
          </div>
        </aside>
      </div>
    </section>
  );
};

const CheckoutInput = ({
  label,
  name,
  type = 'text',
  autoComplete,
}: {
  label: string;
  name: string;
  type?: string;
  autoComplete?: string;
}) => (
  <label className="block">
    <span className="text-[10px] uppercase tracking-[0.3em] text-black/40">{label}</span>
    <input
      required
      name={name}
      type={type}
      autoComplete={autoComplete}
      className="mt-3 w-full border border-black/10 bg-white px-4 py-4 text-sm outline-none transition-colors focus:border-brand-gold"
    />
  </label>
);
