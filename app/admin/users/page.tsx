"use client"

import { useAuth } from "@/lib/auth-context"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import AdminNav from "@/components/admin-nav"
import AdminMobileNav from "@/components/admin-mobile-nav"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { database } from "@/lib/firebase"
import { ref as dbRef, get } from "firebase/database"
import { Users, Calendar, Mail, CheckCircle, XCircle, Clock, Filter } from "lucide-react"
import { SUBSCRIPTION_PLANS } from "@/lib/subscription-context"

interface Subscription {
  planId: string
  startDate: string
  endDate: string
  active: boolean
}

interface User {
  id: string
  email: string
  displayName?: string
  photoURL?: string
  createdAt: string
  lastLogin?: string
  subscription?: Subscription
}

const calculateRemainingTime = (endDate: string) => {
  const now = new Date()
  const expiry = new Date(endDate)
  const diff = expiry.getTime() - now.getTime()

  if (diff <= 0) return "Expired"

  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))

  if (days > 0) {
    return `${days}d ${hours}h`
  } else if (hours > 0) {
    return `${hours}h ${minutes}m`
  } else {
    return `${minutes}m`
  }
}

const getPlanName = (planId: string) => {
  const plan = SUBSCRIPTION_PLANS.find((p) => p.id === planId)
  return plan ? plan.name : planId
}

export default function UsersManagement() {
  const { user, loading, isAdmin } = useAuth()
  const router = useRouter()
  const [users, setUsers] = useState<User[]>([])
  const [usersLoading, setUsersLoading] = useState(true)
  const [showActiveOnly, setShowActiveOnly] = useState(false)

  useEffect(() => {
    if (!loading && (!user || !isAdmin)) {
      router.push("/login")
    }
  }, [user, loading, isAdmin, router])

  useEffect(() => {
    if (isAdmin) {
      loadUsers()
    }
  }, [isAdmin])

  const loadUsers = async () => {
    try {
      const [usersSnap, subscriptionsSnap] = await Promise.all([
        get(dbRef(database, "users")),
        get(dbRef(database, "subscriptions")),
      ])

      if (usersSnap.exists()) {
        const usersData = usersSnap.val()
        const subscriptionsData = subscriptionsSnap.exists() ? subscriptionsSnap.val() : {}

        const usersList = Object.entries(usersData).map(([id, value]: any) => {
          const userSubscription = subscriptionsData[id]

          return {
            id,
            email: value.email || "N/A",
            displayName: value.displayName || "User",
            photoURL: value.photoURL,
            createdAt: value.createdAt || new Date().toISOString(),
            lastLogin: value.lastLogin,
            subscription: userSubscription || undefined,
          }
        })

        // Sort by last login (most recent first)
        usersList.sort((a, b) => {
          const dateA = new Date(a.lastLogin || a.createdAt).getTime()
          const dateB = new Date(b.lastLogin || b.createdAt).getTime()
          return dateB - dateA
        })

        setUsers(usersList)
      }
      setUsersLoading(false)
    } catch (error) {
      console.error("Error loading users:", error)
      setUsersLoading(false)
    }
  }

  const filteredUsers = showActiveOnly
    ? users.filter((userItem) => userItem.subscription?.active && new Date(userItem.subscription.endDate) > new Date())
    : users

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
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
        <div className="mb-4 md:mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl md:text-4xl font-bold text-white mb-2">Manage Users</h1>
              <p className="text-sm md:text-base text-white/70">
                Total Users: {users.length} {showActiveOnly && `| Active: ${filteredUsers.length}`}
              </p>
            </div>
            <Button
              onClick={() => setShowActiveOnly(!showActiveOnly)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition ${
                showActiveOnly
                  ? "bg-purple-600 text-white hover:bg-purple-700"
                  : "bg-white/10 text-white hover:bg-white/20 border border-white/20"
              }`}
            >
              <Filter className="w-4 h-4" />
              {showActiveOnly ? "All Users" : "Active Subscriptions"}
            </Button>
          </div>
        </div>

        {usersLoading ? (
          <div className="flex justify-center items-center h-64">
            <div className="text-white text-base md:text-lg">Loading users...</div>
          </div>
        ) : filteredUsers.length === 0 ? (
          <Card className="bg-white/10 backdrop-blur-md border border-white/20 p-4 md:p-8">
            <div className="text-center">
              <Users className="w-12 h-12 md:w-16 md:h-16 text-white/50 mx-auto mb-4" />
              <p className="text-white/70 text-sm md:text-lg">
                {showActiveOnly ? "No users with active subscriptions" : "No users registered yet"}
              </p>
            </div>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-2 md:gap-4">
            {filteredUsers.map((userItem) => (
              <Card
                key={userItem.id}
                className="bg-white/10 backdrop-blur-md border border-white/20 p-3 md:p-6 hover:border-white/40 transition"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-4 mb-3">
                      {userItem.photoURL && (
                        <img
                          src={userItem.photoURL || "/placeholder.svg"}
                          alt={userItem.displayName}
                          className="w-12 h-12 rounded-full object-cover"
                        />
                      )}
                      <div>
                        <h3 className="text-lg md:text-xl font-semibold text-white">{userItem.displayName}</h3>
                        <div className="flex items-center gap-2 text-white/70 text-sm md:text-base">
                          <Mail className="w-4 h-4" />
                          {userItem.email}
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mt-4">
                      <div>
                        <p className="text-white/60 text-xs md:text-sm uppercase tracking-wider">Created</p>
                        <p className="text-white flex items-center gap-2 text-sm md:text-base mt-1">
                          <Calendar className="w-4 h-4" />
                          {new Date(userItem.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <div>
                        <p className="text-white/60 text-xs md:text-sm uppercase tracking-wider">Last Login</p>
                        <p className="text-white flex items-center gap-2 text-sm md:text-base mt-1">
                          <Calendar className="w-4 h-4" />
                          {userItem.lastLogin ? new Date(userItem.lastLogin).toLocaleDateString() : "Never"}
                        </p>
                      </div>
                    </div>

                    {userItem.subscription && (
                      <div className="mt-4 p-4 bg-white/5 rounded-lg border border-white/10">
                        <p className="text-white/60 text-xs md:text-sm uppercase tracking-wider mb-3">
                          Subscription Details
                        </p>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                          <div>
                            <p className="text-white/50 text-xs md:text-sm">Plan</p>
                            <p className="text-white font-medium text-sm md:text-base mt-1">
                              {getPlanName(userItem.subscription.planId)}
                            </p>
                          </div>
                          <div>
                            <p className="text-white/50 text-xs md:text-sm">Subscribed At</p>
                            <p className="text-white text-sm md:text-base mt-1">
                              {new Date(userItem.subscription.startDate).toLocaleDateString()}
                            </p>
                            <p className="text-white/60 text-xs md:text-sm">
                              {new Date(userItem.subscription.startDate).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </p>
                          </div>
                          <div>
                            <p className="text-white/50 text-xs md:text-sm">Expires At</p>
                            <p className="text-white text-sm md:text-base mt-1">
                              {new Date(userItem.subscription.endDate).toLocaleDateString()}
                            </p>
                            <p className="text-white/60 text-xs md:text-sm">
                              {new Date(userItem.subscription.endDate).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </p>
                          </div>
                          <div>
                            <p className="text-white/50 text-xs md:text-sm flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              Remaining
                            </p>
                            <p className="text-white font-medium text-sm md:text-base mt-1">
                              {calculateRemainingTime(userItem.subscription.endDate)}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="text-right ml-4">
                    {userItem.subscription?.active && new Date(userItem.subscription.endDate) > new Date() ? (
                      <span className="inline-flex items-center gap-1 px-3 py-1 bg-green-500/20 border border-green-400/50 rounded text-green-100 text-xs md:text-sm font-medium">
                        <CheckCircle className="w-3 h-3" />
                        Active
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-3 py-1 bg-red-500/20 border border-red-400/50 rounded text-red-100 text-xs md:text-sm font-medium">
                        <XCircle className="w-3 h-3" />
                        {userItem.subscription ? "Expired" : "No Subscription"}
                      </span>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
