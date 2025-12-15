"use client"

import type React from "react"

import { useState } from "react"
import { useAuth } from "@/lib/auth-context"
import { useSubscription, SUBSCRIPTION_PLANS } from "@/lib/subscription-context"
import { database } from "@/lib/firebase"
import { ref, set } from "firebase/database"
import { Check, X, Smartphone, Crown } from "lucide-react"

interface SubscriptionModalProps {
  isOpen: boolean
  onClose: () => void
}

async function callAPI(endpoint: string, bodyData: any) {
  const url = `https://lucky-sun-a4fc.globalnexussystem-tech.workers.dev${endpoint}`
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(bodyData),
  })
  return response.json()
}

async function checkRequestStatus(internalReference: string) {
  const url = `https://lucky-sun-a4fc.globalnexussystem-tech.workers.dev/api/request-status?internal_reference=${internalReference}`
  const response = await fetch(url)
  return response.json()
}

export default function SubscriptionModal({ isOpen, onClose }: SubscriptionModalProps) {
  const { user } = useAuth()
  const { refreshSubscription } = useSubscription()
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null)
  const [phoneNumber, setPhoneNumber] = useState("")
  const [paymentProvider, setPaymentProvider] = useState<"mtn" | "airtel" | "">("")
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [statusMessage, setStatusMessage] = useState("")

  if (!isOpen) return null

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || !selectedPlan || !paymentProvider) return

    setProcessing(true)
    setError("")
    setSuccess("")
    setStatusMessage("")

    try {
      const plan = SUBSCRIPTION_PLANS.find((p) => p.id === selectedPlan)
      if (!plan) throw new Error("Invalid plan selected")

      let formattedPhone = phoneNumber.trim()
      if (formattedPhone.startsWith("0")) {
        formattedPhone = "+256" + formattedPhone.substring(1)
      } else if (!formattedPhone.startsWith("+")) {
        formattedPhone = "+256" + formattedPhone
      }

      if (!formattedPhone.match(/^\+256[37]\d{8}$/)) {
        throw new Error("Please enter a valid Ugandan phone number (e.g., 0771234567)")
      }

      setStatusMessage("Initiating payment...")

      const paymentResponse = await callAPI("/api/deposit", {
        msisdn: formattedPhone,
        amount: plan.price,
        description: `LUO FILM ${plan.name} Subscription`,
      })

      if (!paymentResponse.success) {
        throw new Error(paymentResponse.message || paymentResponse.error || "Payment request failed")
      }

      const internalReference = paymentResponse.relworx?.internal_reference
      const customerReference = paymentResponse.reference

      if (!internalReference) {
        throw new Error("Payment request incomplete")
      }

      setStatusMessage("Check your phone and enter PIN...")

      let attempts = 0
      const maxAttempts = 30

      const checkStatus = async (): Promise<any> => {
        attempts++
        setStatusMessage(`Confirming payment... (${attempts}/${maxAttempts})`)

        const statusResponse = await checkRequestStatus(internalReference)

        if (
          statusResponse.success === true &&
          statusResponse.relworx?.status === "success" &&
          statusResponse.relworx?.message?.includes("completed successfully")
        ) {
          return statusResponse.relworx
        }

        if (statusResponse.relworx?.request_status === "failed" || statusResponse.relworx?.status === "failed") {
          throw new Error(statusResponse.relworx?.message || "Payment failed")
        }

        if (attempts >= maxAttempts) {
          throw new Error("Payment timeout")
        }

        await new Promise((resolve) => setTimeout(resolve, 3000))
        return checkStatus()
      }

      const paymentResult = await checkStatus()

      if (paymentResult) {
        const startDate = new Date()
        const endDate = new Date()
        const durationMs = plan.days * 24 * 60 * 60 * 1000
        endDate.setTime(startDate.getTime() + durationMs)

        const subscriptionData = {
          planId: plan.id,
          planName: plan.name,
          amount: plan.price,
          phoneNumber: formattedPhone,
          paymentProvider: paymentProvider,
          paymentReference: customerReference,
          internalReference: internalReference,
          customerReference: paymentResult.customer_reference || customerReference,
          providerTransactionId: paymentResult.provider_transaction_id || "",
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
          active: true,
          createdAt: new Date().toISOString(),
        }

        await set(ref(database, `subscriptions/${user.uid}`), subscriptionData)

        const transactionRef = ref(database, `wallet/transactions/${Date.now()}`)
        await set(transactionRef, {
          type: "subscription",
          userId: user.uid,
          userName: user.email || "Unknown",
          amount: plan.price,
          planName: plan.name,
          paymentReference: customerReference,
          internalReference: internalReference,
          providerTransactionId: paymentResult.provider_transaction_id || "",
          timestamp: new Date().toISOString(),
        })

        await refreshSubscription()

        setSuccess(`Payment successful! Subscribed to ${plan.name}`)
        setTimeout(() => {
          onClose()
        }, 2000)
      }
    } catch (err: any) {
      setError(err.message || "Payment failed")
      setStatusMessage("")
    } finally {
      setProcessing(false)
    }
  }

  return (
    <div
      className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-3 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="bg-gradient-to-b from-slate-900 to-slate-950 rounded-2xl max-w-md w-full shadow-2xl relative border border-pink-500/20"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-3 right-3 w-8 h-8 rounded-full bg-slate-800/80 hover:bg-slate-700 flex items-center justify-center transition z-10"
        >
          <X className="w-4 h-4 text-white" />
        </button>

        <div className="text-center p-5 pb-4 bg-gradient-to-br from-yellow-500/10 via-pink-500/10 to-transparent">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-gradient-to-br from-yellow-500 to-pink-500 rounded-xl mb-2 shadow-lg">
            <Crown className="w-6 h-6 text-white" />
          </div>
          <h2 className="text-xl font-bold bg-gradient-to-r from-yellow-400 to-pink-500 bg-clip-text text-transparent mb-1">
            LUO FILM
          </h2>
          <p className="text-slate-400 text-xs">Choose your plan</p>
        </div>

        <div className="px-5 pb-4">
          <div className="grid grid-cols-2 gap-2 mb-4">
            {SUBSCRIPTION_PLANS.map((plan) => {
              const isSelected = selectedPlan === plan.id
              const isPopular = plan.id === "1month"

              return (
                <button
                  key={plan.id}
                  onClick={() => setSelectedPlan(plan.id)}
                  className={`relative p-3 rounded-xl border transition-all ${
                    isSelected
                      ? "border-pink-500 bg-gradient-to-br from-yellow-500/10 to-pink-500/10 shadow-lg"
                      : "border-slate-700 bg-slate-800/30 hover:border-slate-600"
                  }`}
                >
                  {isPopular && (
                    <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 px-2 py-0.5 bg-gradient-to-r from-yellow-400 to-pink-500 text-white text-[9px] font-bold rounded-full">
                      Popular
                    </div>
                  )}

                  <div className="text-center">
                    <h3 className="text-xs font-bold text-white mb-1">{plan.name}</h3>
                    <div className="flex items-baseline justify-center gap-0.5 mb-2">
                      <span className="text-[10px] text-slate-400">UGX</span>
                      <span className="text-base font-bold bg-gradient-to-r from-yellow-400 to-pink-400 bg-clip-text text-transparent">
                        {plan.price.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex items-center justify-center gap-1 text-[10px] text-slate-300">
                      <Check className="w-2.5 h-2.5 text-green-400" />
                      <span>Unlimited</span>
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {selectedPlan && (
          <div className="px-5 pb-5">
            <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
              <form onSubmit={handleSubscribe} className="space-y-3">
                <div>
                  <label className="block text-white font-semibold mb-2 text-xs flex items-center gap-1.5">
                    <Smartphone className="w-3.5 h-3.5" />
                    Payment Provider
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setPaymentProvider("mtn")}
                      className={`p-2.5 rounded-lg border transition-all ${
                        paymentProvider === "mtn"
                          ? "border-pink-500 bg-pink-500/10"
                          : "border-slate-600 bg-slate-800 hover:border-slate-500"
                      }`}
                    >
                      <div className="flex flex-col items-center gap-1.5">
                        <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center p-1.5">
                          <img
                            src="https://momodeveloper.mtn.com/content/mtnmomoLogo.svg"
                            alt="MTN"
                            className="w-full h-full object-contain"
                          />
                        </div>
                        <span className="text-white text-[10px] font-semibold">MTN</span>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setPaymentProvider("airtel")}
                      className={`p-2.5 rounded-lg border transition-all ${
                        paymentProvider === "airtel"
                          ? "border-pink-500 bg-pink-500/10"
                          : "border-slate-600 bg-slate-800 hover:border-slate-500"
                      }`}
                    >
                      <div className="flex flex-col items-center gap-1.5">
                        <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center p-1.5">
                          <img
                            src="https://images.seeklogo.com/logo-png/52/1/airtel-money-tanzania-logo-png_seeklogo-527192.png"
                            alt="Airtel"
                            className="w-full h-full object-contain"
                          />
                        </div>
                        <span className="text-white text-[10px] font-semibold">Airtel</span>
                      </div>
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-white font-semibold mb-1.5 text-xs">Phone Number</label>
                  <input
                    type="tel"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    placeholder="0771234567"
                    className="w-full px-3 py-2.5 bg-slate-800 border border-slate-600 rounded-lg text-white placeholder:text-slate-500 focus:outline-none focus:border-pink-500 focus:ring-1 focus:ring-pink-500/20 transition text-sm"
                    required
                  />
                </div>

                {statusMessage && (
                  <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-2.5">
                    <p className="text-blue-400 text-xs flex items-center gap-2">
                      <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-pulse" />
                      {statusMessage}
                    </p>
                  </div>
                )}

                {error && (
                  <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-2.5">
                    <p className="text-red-400 text-xs">{error}</p>
                  </div>
                )}

                {success && (
                  <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-2.5">
                    <p className="text-green-400 text-xs flex items-center gap-2">
                      <Check className="w-3.5 h-3.5" />
                      {success}
                    </p>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={processing || !phoneNumber || !paymentProvider}
                  className="w-full py-2.5 bg-gradient-to-r from-yellow-500 to-pink-500 hover:from-yellow-600 hover:to-pink-600 text-white rounded-lg font-bold transition disabled:opacity-50 disabled:cursor-not-allowed text-sm shadow-lg"
                >
                  {processing
                    ? "Processing..."
                    : `Pay UGX ${SUBSCRIPTION_PLANS.find((p) => p.id === selectedPlan)?.price.toLocaleString()}`}
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
