// Add import for Modal
import { Modal } from '@/components/Modal';
import { Input } from '@/components/Input';
// Add fundWallet logic
const [walletModalOpen, setWalletModalOpen] = useState(false);
const [fundAmount, setFundAmount] = useState('');
const [fundMessage, setFundMessage] = useState('');
const [sendNotification, setSendNotification] = useState(true);
const [funding, setFunding] = useState(false);

const handleFundWallet = async (e: React.FormEvent) => {
  e.preventDefault();
  const amt = parseFloat(fundAmount);
  if (isNaN(amt) || amt <= 0) return;
  setFunding(true);
  try {
    await api.post(`/admin/users/${id}/wallet/fund`, {
      amountPaise: Math.round(amt * 100),
      message: sendNotification ? fundMessage : undefined,
    });
    setWalletModalOpen(false);
    setFundAmount('');
    void load(); // reload user data
  } catch (err) {
    alert(errorMessage(err));
  } finally {
    setFunding(false);
  }
};

// Update default message when amount changes
useEffect(() => {
  if (fundAmount) {
    setFundMessage(`Your wallet has been credited with ₹${fundAmount}. Use it on your next booking!`);
  } else {
    setFundMessage('');
  }
}, [fundAmount]);

// Render inside UserDetailPage:
        <SectionCard title="Wallet">
          <Field label="Balance">
            ₹{((user.walletBalancePaise || 0) / 100).toFixed(2)}
          </Field>
          <div className="mt-4">
            <Button size="sm" onClick={() => setWalletModalOpen(true)}>Fund Wallet</Button>
          </div>
        </SectionCard>

      <Modal open={walletModalOpen} onClose={() => setWalletModalOpen(false)} title="Fund Wallet">
        <form onSubmit={handleFundWallet} className="space-y-4">
          <Input
            label="Amount (₹)"
            type="number"
            min="1"
            step="1"
            required
            value={fundAmount}
            onChange={(e) => setFundAmount(e.target.value)}
          />
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-slate-700">Message</label>
            <textarea
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              rows={3}
              value={fundMessage}
              onChange={(e) => setFundMessage(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="sendNotification"
              checked={sendNotification}
              onChange={(e) => setSendNotification(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-600"
            />
            <label htmlFor="sendNotification" className="text-sm text-slate-700">Send notification to user</label>
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="secondary" onClick={() => setWalletModalOpen(false)} type="button">Cancel</Button>
            <Button type="submit" loading={funding}>Fund Wallet</Button>
          </div>
        </form>
      </Modal>
