"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { useSubscription, SUBSCRIPTION_PLANS } from "@/lib/subscription-context"
import { database } from "@/lib/firebase"
import { ref, set } from "firebase/database"
import { Check, ArrowLeft, Smartphone } from "lucide-react"
import Link from "next/link"

async function callAPI(endpoint: string, bodyData: any) {
  const url = `https://lucky-sun-a4fc.globalnexussystem-tech.workers.dev${endpoint}`

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(bodyData),
    })

    const data = await response.json()
    console.log("[v0] API Response:", data)
    return data
  } catch (err: any) {
    console.error("[v0] API Error:", err)
    return { success: false, error: err.message }
  }
}

async function checkRequestStatus(internalReference: string) {
  const url = `https://lucky-sun-a4fc.globalnexussystem-tech.workers.dev/api/request-status?internal_reference=${internalReference}`

  try {
    const response = await fetch(url)
    const data = await response.json()
    console.log("[v0] Status check response:", data)
    return data
  } catch (err: any) {
    console.error("[v0] Status API Error:", err)
    return { success: false, error: err.message }
  }
}

export default function SubscribePage() {
  const router = useRouter()
  const { user } = useAuth()
  const { subscription, hasActiveSubscription, refreshSubscription } = useSubscription()
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null)
  const [phoneNumber, setPhoneNumber] = useState("")
  const [paymentProvider, setPaymentProvider] = useState<"mtn" | "airtel" | "">("")
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [statusMessage, setStatusMessage] = useState("")

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

      // Validate phone number (basic validation for Ugandan numbers)
      let formattedPhone = phoneNumber.trim()
      if (formattedPhone.startsWith("0")) {
        formattedPhone = "+256" + formattedPhone.substring(1)
      } else if (!formattedPhone.startsWith("+")) {
        formattedPhone = "+256" + formattedPhone
      }

      if (!formattedPhone.match(/^\+256[37]\d{8}$/)) {
        throw new Error("Please enter a valid Ugandan phone number (e.g., 0771234567)")
      }

      setStatusMessage("Initiating payment request...")

      const paymentResponse = await callAPI("/api/deposit", {
        msisdn: formattedPhone,
        amount: plan.price,
        description: `LUO FILM ${plan.name} Subscription`,
      })

      console.log("[v0] Full payment response:", JSON.stringify(paymentResponse, null, 2))

      // Check if payment request was successful
      if (!paymentResponse.success) {
        throw new Error(paymentResponse.message || paymentResponse.error || "Payment request failed")
      }

      // Extract internal_reference from nested relworx object
      const internalReference = paymentResponse.relworx?.internal_reference
      const customerReference = paymentResponse.reference

      if (!internalReference) {
        console.error("[v0] Missing internal_reference in response:", paymentResponse)
        throw new Error("Payment request incomplete - no reference received")
      }

      console.log("[v0] Payment initiated - Internal Ref:", internalReference, "Customer Ref:", customerReference)
      setStatusMessage("Payment request sent. Please check your phone and enter your PIN...")

      let attempts = 0
      const maxAttempts = 30
      const pollInterval = 3000

      const checkStatus = async (): Promise<any> => {
        attempts++
        setStatusMessage(`Waiting for payment confirmation... (${attempts}/${maxAttempts})`)

        const statusResponse = await checkRequestStatus(internalReference)
        console.log("[v0] Status attempt", attempts, ":", JSON.stringify(statusResponse, null, 2))

        // Check if payment is completed successfully - the success data is in the relworx object
        if (
          statusResponse.success === true &&
          statusResponse.relworx?.status === "success" &&
          statusResponse.relworx?.message?.includes("completed successfully")
        ) {
          console.log("[v0] Payment completed successfully!")
          return statusResponse.relworx // Return the relworx object with full payment details
        }

        // Check for failure
        if (statusResponse.relworx?.request_status === "failed" || statusResponse.relworx?.status === "failed") {
          throw new Error(statusResponse.relworx?.message || "Payment failed. Please try again.")
        }

        // Continue polling if still in progress
        if (attempts >= maxAttempts) {
          throw new Error("Payment timeout. Please check your phone and try again if the payment didn't go through.")
        }

        await new Promise((resolve) => setTimeout(resolve, pollInterval))
        return checkStatus()
      }

      const paymentResult = await checkStatus()

      if (paymentResult) {
        console.log("[v0] Processing subscription activation...")
        const startDate = new Date()
        const endDate = new Date()
        // This fixes subscriptions with fractional days (1 hour, 12 hours)
        const durationMs = plan.days * 24 * 60 * 60 * 1000
        endDate.setTime(startDate.getTime() + durationMs)

        // Store subscription in Firebase
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

        console.log("[v0] Saving subscription to Firebase:", subscriptionData)
        await set(ref(database, `subscriptions/${user.uid}`), subscriptionData)
        console.log("[v0] Subscription saved successfully")

        // Store transaction only - admin wallet will calculate balance from all transactions
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
        console.log("[v0] Transaction recorded")

        await refreshSubscription()
        console.log("[v0] Subscription refreshed")

        setSuccess(`Payment successful! Subscribed to ${plan.name}. Redirecting...`)
        setTimeout(() => {
          router.push("/")
        }, 2000)
      }
    } catch (err: any) {
      console.error("[v0] Payment error:", err)
      setError(err.message || "Payment failed. Please try again.")
      setStatusMessage("")
    } finally {
      setProcessing(false)
    }
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-white text-xl mb-6">Please log in to subscribe</p>
          <button
            onClick={() => router.push("/login")}
            className="px-8 py-3 bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-600 hover:to-purple-700 text-white rounded-lg font-semibold transition"
          >
            Login
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      <div className="sticky top-0 z-50 bg-slate-950/80 backdrop-blur-xl border-b border-slate-800 p-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-white hover:text-cyan-400 transition">
            <ArrowLeft className="w-5 h-5" />
            <span className="font-semibold">Back</span>
          </Link>
          <h1 className="text-xl font-bold bg-gradient-to-r from-yellow-400 to-pink-500 bg-clip-text text-transparent">
            Subscribe to LUO FILM
          </h1>
          <div className="w-20" />
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-4 sm:p-8">
        {hasActiveSubscription && subscription && (
          <div className="mb-8 bg-gradient-to-r from-green-500/10 to-emerald-500/10 border border-green-500/30 rounded-xl p-5">
            <div className="flex items-center gap-3 mb-1">
              <div className="w-2.5 h-2.5 bg-green-500 rounded-full animate-pulse" />
              <h2 className="text-lg font-bold text-white">Active Subscription</h2>
            </div>
            <p className="text-green-400 text-sm">
              Your subscription is active until {new Date(subscription.endDate).toLocaleDateString()}
            </p>
          </div>
        )}

        <div className="mb-8">
          <h2 className="text-2xl sm:text-3xl font-bold text-white text-center mb-2">Choose Your Plan</h2>
          <p className="text-slate-400 text-center mb-6">Unlock unlimited access to movies and series</p>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
            {SUBSCRIPTION_PLANS.map((plan) => {
              const isPopular = plan.id === "1week"
              const isSelected = selectedPlan === plan.id

              return (
                <button
                  key={plan.id}
                  onClick={() => setSelectedPlan(plan.id)}
                  className={`relative p-4 rounded-xl border-2 transition-all transform hover:scale-105 ${
                    isSelected
                      ? "border-cyan-500 bg-gradient-to-br from-cyan-500/20 to-purple-500/20 shadow-lg shadow-cyan-500/20"
                      : "border-slate-700 bg-slate-800/50 hover:border-slate-600"
                  }`}
                >
                  {isPopular && (
                    <div className="absolute -top-2 left-1/2 -translate-x-1/2 px-2 py-0.5 bg-gradient-to-r from-cyan-500 to-purple-500 text-white text-xs font-bold rounded-full">
                      Popular
                    </div>
                  )}

                  <div className="text-center mb-3">
                    <h3 className="text-base font-bold text-white mb-1">{plan.name}</h3>
                    <div className="flex items-baseline justify-center gap-0.5">
                      <span className="text-xs text-slate-400">UGX</span>
                      <span className="text-xl font-bold bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
                        {plan.price.toLocaleString()}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-1.5 text-xs">
                    <div className="flex items-center gap-1.5 text-slate-300">
                      <Check className="w-3.5 h-3.5 text-cyan-400 flex-shrink-0" />
                      <span>Unlimited streaming</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-slate-300">
                      <Check className="w-3.5 h-3.5 text-cyan-400 flex-shrink-0" />
                      <span>Download movies</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-slate-300">
                      <Check className="w-3.5 h-3.5 text-cyan-400 flex-shrink-0" />
                      <span>HD quality</span>
                    </div>
                  </div>

                  {isSelected && <div className="absolute inset-0 rounded-xl bg-cyan-500/5 pointer-events-none" />}
                </button>
              )
            })}
          </div>
        </div>

        {selectedPlan && (
          <div className="max-w-md mx-auto bg-slate-900/80 backdrop-blur-sm border border-slate-700 rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2.5 bg-gradient-to-br from-cyan-500 to-purple-600 rounded-xl">
                <Smartphone className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Complete Payment</h3>
                <p className="text-slate-400 text-sm">Secure mobile money transaction</p>
              </div>
            </div>

            <form onSubmit={handleSubscribe} className="space-y-4">
              <div>
                <label className="block text-white font-semibold mb-2">Payment Provider</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setPaymentProvider("mtn")}
                    className={`p-4 rounded-xl border-2 transition-all ${
                      paymentProvider === "mtn"
                        ? "border-cyan-500 bg-cyan-500/10"
                        : "border-slate-600 bg-slate-800 hover:border-slate-500"
                    }`}
                  >
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-16 h-16 bg-yellow-400 rounded-xl flex items-center justify-center">
                        <span className="text-2xl font-black text-slate-900">MTN</span>
                      </div>
                      <span className="text-white text-sm font-semibold">MTN Mobile Money</span>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentProvider("airtel")}
                    className={`p-4 rounded-xl border-2 transition-all ${
                      paymentProvider === "airtel"
                        ? "border-cyan-500 bg-cyan-500/10"
                        : "border-slate-600 bg-slate-800 hover:border-slate-500"
                    }`}
                  >
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-16 h-16 bg-red-600 rounded-xl flex items-center justify-center">
                        <span className="text-2xl font-black text-white">airtel</span>
                      </div>
                      <span className="text-white text-sm font-semibold">Airtel Money</span>
                    </div>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-white font-semibold mb-2">Phone Number</label>
                <input
                  type="tel"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="0771234567"
                  className="w-full px-4 py-3 bg-slate-800 border border-slate-600 rounded-lg text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-500 transition"
                  required
                />
                <p className="text-slate-400 text-xs mt-1.5">
                  Enter your{" "}
                  {paymentProvider === "mtn" ? "MTN" : paymentProvider === "airtel" ? "Airtel" : "mobile money"} number
                </p>
              </div>

              {statusMessage && (
                <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3">
                  <p className="text-blue-400 text-sm flex items-center gap-2">
                    <span className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" />
                    {statusMessage}
                  </p>
                </div>
              )}

              {error && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
                  <p className="text-red-400 text-sm">{error}</p>
                </div>
              )}

              {success && (
                <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3">
                  <p className="text-green-400 text-sm">{success}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={processing || !phoneNumber || !paymentProvider}
                className="w-full py-3.5 bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-600 hover:to-purple-700 text-white rounded-lg font-bold transition disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-cyan-500/20"
              >
                {processing
                  ? "Processing..."
                  : `Pay UGX ${SUBSCRIPTION_PLANS.find((p) => p.id === selectedPlan)?.price.toLocaleString()}`}
              </button>

              <p className="text-slate-400 text-xs text-center leading-relaxed">
                You will receive a prompt on your phone to confirm the payment
              </p>
            </form>
          </div>
        )}
      </div>
    </div>
  )
}
