import { createContext, useContext, useState, ReactNode } from "react";

export type TransactionType = "deposit" | "withdrawal" | "investment" | "earning" | "referral";
export type TransactionStatus = "completed" | "pending" | "rejected";

export interface Transaction {
  id: string;
  type: TransactionType;
  amount: number;
  status: TransactionStatus;
  description: string;
  phoneNumber?: string;
  requestedAt: string;
  processedAt?: string | null;
}

interface TransactionContextType {
  transactions: Transaction[];
  addTransaction: (transaction: Omit<Transaction, "id" | "requestedAt">) => void;
  earningsBalance: number;
  investmentBalance: number;
  updateBalances: (earnings: number, investment: number) => void;
}

const TransactionContext = createContext<TransactionContextType | undefined>(undefined);

export const TransactionProvider = ({ children }: { children: ReactNode }) => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [earningsBalance, setEarningsBalance] = useState(320);
  const [investmentBalance, setInvestmentBalance] = useState(0);

  const addTransaction = (transaction: Omit<Transaction, "id" | "requestedAt">) => {
    const newTransaction: Transaction = {
      ...transaction,
      id: Date.now().toString(),
      requestedAt: new Date().toLocaleString(),
    };
    setTransactions((prev) => [newTransaction, ...prev]);
  };

  const updateBalances = (earnings: number, investment: number) => {
    setEarningsBalance(earnings);
    setInvestmentBalance(investment);
  };

  return (
    <TransactionContext.Provider
      value={{
        transactions,
        addTransaction,
        earningsBalance,
        investmentBalance,
        updateBalances,
      }}
    >
      {children}
    </TransactionContext.Provider>
  );
};

export const useTransactions = () => {
  const context = useContext(TransactionContext);
  if (!context) {
    throw new Error("useTransactions must be used within TransactionProvider");
  }
  return context;
};
