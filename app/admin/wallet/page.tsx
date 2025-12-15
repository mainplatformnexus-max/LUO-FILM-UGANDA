"use client"

import type React from "react"

import { useAuth } from "@/lib/auth-context"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import AdminNav from "@/components/admin-nav"
import AdminMobileNav from "@/components/admin-mobile-nav"
import { Card } from "@/components/ui/card"
import { database } from "@/lib/firebase"
import { ref, get, set, remove } from "firebase/database"
import { DollarSign, TrendingUp, ArrowDownToLine, Loader2, Trash2, Edit2, X, Check } from "lucide-react"

async function callWithdrawAPI(msisdn: string, amount: number) {
  const url = `https://lucky-sun-a4fc.globalnexussystem-tech.workers.dev/api/withdraw`

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        msisdn,
        amount,
        description: "DIMPOZ Admin Withdrawal",
      }),
    })

    return await response.json()
  } catch (err: any) {
    console.error("Withdraw API Error:", err)
    return { success: false, error: err.message }
  }
}

export default function WalletPage() {
  const { user, loading, isAdmin } = useAuth()
  const router = useRouter()
  const [balance, setBalance] = useState(0)
  const [transactions, setTransactions] = useState<any[]>([])
  const [withdrawAmount, setWithdrawAmount] = useState("")
  const [withdrawPhone, setWithdrawPhone] = useState("")
  const [processing, setProcessing] = useState(false)
  const [message, setMessage] = useState({ type: "", text: "" })
  const [loadingData, setLoadingData] = useState(true)
  const [editingBalance, setEditingBalance] = useState(false)
  const [editBalanceValue, setEditBalanceValue] = useState("")
  const [deletingTxId, setDeletingTxId] = useState<string | null>(null)
  const [isMasterAdmin, setIsMasterAdmin] = useState(false)

  useEffect(() => {
    if (!loading && (!user || !isAdmin)) {
      router.push("/login")
    }
  }, [user, loading, isAdmin, router])

  useEffect(() => {
    // Allow all admins to have master admin access
    setIsMasterAdmin(true)
  }, [user])

  useEffect(() => {
    if (isAdmin) {
      loadWalletData()
    }
  }, [isAdmin])

  const loadWalletData = async () => {
    setLoadingData(true)
    try {
      const transactionsSnap = await get(ref(database, "wallet/transactions"))

      let calculatedBalance = 0
      const txArray: any[] = []

      if (transactionsSnap.exists()) {
        const txData = transactionsSnap.val()
        Object.entries(txData).forEach(([key, value]: [string, any]) => {
          const tx = { id: key, ...value }
          tx.amount = tx.amount ?? 0
          txArray.push(tx)

          // Calculate balance from transactions
          if (tx.type === "subscription" || tx.type === "fee") {
            calculatedBalance += tx.amount
          } else if (tx.type === "withdrawal") {
            calculatedBalance -= tx.amount
          }
        })
        txArray.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      }

      setBalance(calculatedBalance)
      setTransactions(txArray)
    } catch (error) {
      console.error("Error loading wallet data:", error)
    } finally {
      setLoadingData(false)
    }
  }

  const handleWithdraw = async (e: React.FormEvent) => {
    e.preventDefault()
    setProcessing(true)
    setMessage({ type: "", text: "" })

    try {
      const amount = Number.parseFloat(withdrawAmount)
      if (isNaN(amount) || amount <= 0) {
        throw new Error("Invalid amount")
      }

      if (amount > balance) {
        throw new Error("Insufficient balance")
      }

      const relworxFee = (amount / 1000) * 200
      const netAmount = amount - relworxFee

      // Format phone number
      let formattedPhone = withdrawPhone.trim()
      if (formattedPhone.startsWith("0")) {
        formattedPhone = "+256" + formattedPhone.substring(1)
      } else if (!formattedPhone.startsWith("+")) {
        formattedPhone = "+256" + formattedPhone
      }

      if (!formattedPhone.match(/^\+256[37]\d{8}$/)) {
        throw new Error("Please enter a valid Ugandan phone number")
      }

      // Call withdrawal API with net amount (after fee)
      const withdrawResult = await callWithdrawAPI(formattedPhone, netAmount)

      if (!withdrawResult.success) {
        throw new Error(withdrawResult.error || "Withdrawal failed")
      }

      const transactionRef = ref(database, `wallet/transactions/${Date.now()}`)
      await set(transactionRef, {
        type: "withdrawal",
        amount: amount, // Store the full amount for accurate calculation
        netAmount: netAmount,
        fee: relworxFee,
        phoneNumber: formattedPhone,
        reference: withdrawResult.internal_reference || "",
        timestamp: new Date().toISOString(),
      })

      const earningsRef = ref(database, `wallet/transactions/${Date.now() + 1}`)
      await set(earningsRef, {
        type: "fee",
        amount: relworxFee,
        source: "relworx_withdrawal_fee",
        timestamp: new Date().toISOString(),
      })

      setMessage({
        type: "success",
        text: `Withdrawal successful! UGX ${netAmount.toLocaleString()} sent to ${formattedPhone}. Relworx Fee: UGX ${relworxFee.toLocaleString()}`,
      })
      setWithdrawAmount("")
      setWithdrawPhone("")
      loadWalletData()
    } catch (err: any) {
      setMessage({ type: "error", text: err.message || "Withdrawal failed" })
    } finally {
      setProcessing(false)
    }
  }

  const handleEditBalance = async () => {
    if (!isMasterAdmin) {
      setMessage({ type: "error", text: "Unauthorized: Only master admin can edit balance" })
      return
    }

    const newBalance = Number.parseFloat(editBalanceValue)
    if (isNaN(newBalance) || newBalance < 0) {
      setMessage({ type: "error", text: "Invalid balance amount" })
      return
    }

    try {
      setProcessing(true)
      const balanceRef = ref(database, "wallet/balance")
      await set(balanceRef, {
        amount: newBalance,
        updatedBy: user?.email,
        updatedAt: new Date().toISOString(),
      })

      setMessage({ type: "success", text: `Balance updated to UGX ${newBalance.toLocaleString()}` })
      setEditingBalance(false)
      setEditBalanceValue("")
      loadWalletData()
    } catch (err: any) {
      setMessage({ type: "error", text: "Failed to update balance" })
    } finally {
      setProcessing(false)
    }
  }

  const handleDeleteTransaction = async (txId: string) => {
    if (!isMasterAdmin) {
      setMessage({ type: "error", text: "Unauthorized: Only master admin can delete transactions" })
      return
    }

    try {
      setDeletingTxId(txId)
      const txRef = ref(database, `wallet/transactions/${txId}`)
      await remove(txRef)

      setMessage({ type: "success", text: "Transaction deleted successfully" })
      loadWalletData()
    } catch (err: any) {
      setMessage({ type: "error", text: "Failed to delete transaction" })
    } finally {
      setDeletingTxId(null)
    }
  }

  if (loading || loadingData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center">
        <div className="flex items-center gap-3 text-white text-xl">
          <Loader2 className="w-6 h-6 animate-spin" />
          <span>Loading...</span>
        </div>
      </div>
    )
  }

  if (!isAdmin) {
    return null
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800">
      <AdminNav />
      <AdminMobileNav />

      <div className="max-w-7xl mx-auto p-3 md:p-6 pb-20 md:pb-6">
        <h1 className="text-2xl md:text-4xl font-bold text-white mb-2">Wallet</h1>
        <p className="text-sm md:text-base text-white/70 mb-4 md:mb-8">Manage your earnings and withdrawals</p>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-6 mb-4 md:mb-8">
          <Card className="bg-gradient-to-br from-cyan-500/20 to-purple-500/20 border border-cyan-500/30 p-3 md:p-6">
            <div className="flex items-center justify-between mb-2">
              <div className="text-cyan-400 text-xs md:text-sm font-semibold">Available Balance</div>
              {isMasterAdmin ? (
                <button
                  onClick={() => {
                    setEditingBalance(!editingBalance)
                    setEditBalanceValue(balance.toString())
                  }}
                  className="p-1 hover:bg-cyan-500/20 rounded transition"
                  title="Edit balance"
                >
                  <Edit2 className="w-4 h-4 text-cyan-400" />
                </button>
              ) : (
                <DollarSign className="w-4 h-4 md:w-5 md:h-5 text-cyan-400" />
              )}
            </div>
            {editingBalance && isMasterAdmin ? (
              <div className="flex gap-2">
                <input
                  type="number"
                  value={editBalanceValue}
                  onChange={(e) => setEditBalanceValue(e.target.value)}
                  className="flex-1 px-2 py-1 bg-slate-800 border border-cyan-500 rounded text-white text-sm"
                  min="0"
                />
                <button
                  onClick={handleEditBalance}
                  disabled={processing}
                  className="p-1 bg-green-500/20 hover:bg-green-500/30 rounded disabled:opacity-50"
                >
                  <Check className="w-4 h-4 text-green-400" />
                </button>
                <button
                  onClick={() => {
                    setEditingBalance(false)
                    setEditBalanceValue("")
                  }}
                  className="p-1 bg-red-500/20 hover:bg-red-500/30 rounded"
                >
                  <X className="w-4 h-4 text-red-400" />
                </button>
              </div>
            ) : (
              <div className="text-xl md:text-4xl font-bold text-white">
                UGX {Math.max(0, balance || 0).toLocaleString()}
              </div>
            )}
          </Card>

          <Card className="bg-white/10 backdrop-blur-md border border-white/20 p-3 md:p-6">
            <div className="flex items-center justify-between mb-2">
              <div className="text-white/80 text-xs md:text-sm font-semibold">Total Transactions</div>
              <TrendingUp className="w-4 h-4 md:w-5 md:h-5 text-green-400" />
            </div>
            <div className="text-xl md:text-4xl font-bold text-white">{transactions.length}</div>
          </Card>

          <Card className="bg-white/10 backdrop-blur-md border border-white/20 p-3 md:p-6 col-span-2 md:col-span-1">
            <div className="flex items-center justify-between mb-2">
              <div className="text-white/80 text-xs md:text-sm font-semibold">Total Earned</div>
              <TrendingUp className="w-4 h-4 md:w-5 md:h-5 text-purple-400" />
            </div>
            <div className="text-xl md:text-4xl font-bold text-white">
              UGX{" "}
              {Math.max(
                0,
                transactions
                  .filter((tx) => tx.type === "subscription")
                  .reduce((sum, tx) => sum + (tx.amount ?? 0), 0) || 0,
              ).toLocaleString()}
            </div>
          </Card>
        </div>

        <div className="grid grid-cols-1 gap-4 md:gap-6 mb-4 md:mb-8">
          <Card className="bg-white/10 backdrop-blur-md border border-white/20 p-4 md:p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-gradient-to-br from-cyan-500 to-purple-600 rounded-lg">
                <ArrowDownToLine className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Withdraw Funds</h2>
                <p className="text-white/70 text-sm">20% Relworx fee (200 UGX per 1000 UGX)</p>
              </div>
            </div>

            <form onSubmit={handleWithdraw} className="space-y-4">
              <div>
                <label className="block text-white font-semibold mb-2">Amount (UGX)</label>
                <input
                  type="number"
                  value={withdrawAmount}
                  onChange={(e) => setWithdrawAmount(e.target.value)}
                  placeholder="Enter amount"
                  className="w-full px-4 py-3 bg-slate-800 border border-slate-600 rounded-lg text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-500 transition"
                  required
                  min="1000"
                  max={balance}
                />
                {withdrawAmount && (
                  <p className="text-slate-400 text-xs mt-1.5">
                    You will receive: UGX {(Number.parseFloat(withdrawAmount) * 0.8).toLocaleString()} (Relworx Fee: UGX{" "}
                    {(Number.parseFloat(withdrawAmount) * 0.2).toLocaleString()})
                  </p>
                )}
              </div>

              <div>
                <label className="block text-white font-semibold mb-2">Phone Number</label>
                <input
                  type="tel"
                  value={withdrawPhone}
                  onChange={(e) => setWithdrawPhone(e.target.value)}
                  placeholder="0771234567"
                  className="w-full px-4 py-3 bg-slate-800 border border-slate-600 rounded-lg text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-500 transition"
                  required
                />
              </div>

              {message.text && (
                <div
                  className={`rounded-lg p-3 ${
                    message.type === "success"
                      ? "bg-green-500/10 border border-green-500/30"
                      : "bg-red-500/10 border border-red-500/30"
                  }`}
                >
                  <p className={`text-sm ${message.type === "success" ? "text-green-400" : "text-red-400"}`}>
                    {message.text}
                  </p>
                </div>
              )}

              <button
                type="submit"
                disabled={processing || !withdrawAmount || !withdrawPhone || balance === 0}
                className="w-full py-3 bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-600 hover:to-purple-700 text-white rounded-lg font-bold transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {processing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  "Withdraw Funds"
                )}
              </button>
            </form>
          </Card>

          <Card className="bg-white/10 backdrop-blur-md border border-white/20 p-4 md:p-6">
            <h2 className="text-xl font-bold text-white mb-4">Recent Transactions</h2>
            <div className="space-y-3 max-h-[400px] overflow-y-auto">
              {transactions.slice(0, 10).map((tx) => (
                <div
                  key={tx.id}
                  className={`p-3 rounded-lg flex items-start justify-between ${
                    tx.type === "subscription"
                      ? "bg-green-500/10 border border-green-500/30"
                      : tx.type === "withdrawal"
                        ? "bg-red-500/10 border border-red-500/30"
                        : "bg-purple-500/10 border border-purple-500/30"
                  }`}
                >
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span
                        className={`font-semibold ${
                          tx.type === "subscription"
                            ? "text-green-400"
                            : tx.type === "withdrawal"
                              ? "text-red-400"
                              : "text-purple-400"
                        }`}
                      >
                        {tx.type === "subscription"
                          ? `+UGX ${(tx.amount ?? 0).toLocaleString()}`
                          : tx.type === "withdrawal"
                            ? `-UGX ${(tx.amount ?? 0).toLocaleString()}`
                            : `+UGX ${(tx.amount ?? 0).toLocaleString()}`}
                      </span>
                      <span className="text-white/60 text-xs">{new Date(tx.timestamp).toLocaleDateString()}</span>
                    </div>
                    <div className="text-white/70 text-sm">
                      {tx.type === "subscription" && `${tx.planName} - ${tx.userId}`}
                      {tx.type === "withdrawal" &&
                        `Withdrawn to ${tx.phoneNumber} (Net: UGX ${(tx.netAmount ?? 0).toLocaleString()})`}
                      {tx.type === "fee" && "Relworx Withdrawal Fee (20%)"}
                    </div>
                  </div>
                  {isMasterAdmin && (
                    <button
                      onClick={() => handleDeleteTransaction(tx.id)}
                      disabled={deletingTxId === tx.id}
                      className="ml-2 p-1.5 hover:bg-red-500/20 rounded transition disabled:opacity-50"
                      title="Delete transaction"
                    >
                      <Trash2 className="w-4 h-4 text-red-400" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
