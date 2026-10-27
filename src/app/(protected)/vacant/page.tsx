"use client"
import React, { useEffect, useState } from "react"
import API from "@/lib/api/axiosClient"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Skeleton } from "@/components/ui/skeleton"
import { DoorClosed, Sparkles, MapPin, Building, AlertTriangle } from "lucide-react"

type RoomItem = { room: string; type: string }
type VacantResult = Record<string, RoomItem[]>
type Availability = { timetableCount: number; minimumRequired: number } | null

const BLOCKS = ["C"]
const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]
const SLOTS = ["09:00-09:50", "10:00-10:50", "11:00-11:50", "12:00-12:50", "01:00-01:50", "02:00-02:50", "03:00-03:50", "04:00-04:50"]

export default function VacantPage() {
  const [block, setBlock] = useState("C")
  const [day, setDay] = useState("Monday")
  const [slot, setSlot] = useState(SLOTS[0])
  const [data, setData] = useState<VacantResult>({})
  const [activeFloor, setActiveFloor] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [availability, setAvailability] = useState<Availability>(null)

  useEffect(() => {
    setLoading(true)
    setError(null)
    setAvailability(null)
    API.get(`/vacant?block=${block}&day=${day}&slot=${slot}`)
      .then(res => {
        if (res.data.success) {
          setAvailability(null)
          const newData: VacantResult = res.data.data
          const floors = Object.keys(newData)
          setData(newData)
          setActiveFloor(prev => (prev && floors.includes(prev) ? prev : floors[0] ?? null))
        } else {
          setData({})
          setActiveFloor(null)
          if (res.data.code === "INSUFFICIENT_TIMETABLES") {
            setAvailability({
              timetableCount: res.data.timetableCount,
              minimumRequired: res.data.minimumRequired,
            })
          }
        }
      })
      .catch(() => {
        setError("Unable to fetch vacant classrooms")
        setData({})
        setActiveFloor(null)
      })
      .finally(() => setLoading(false))
  }, [block, day, slot])

  const floors = Object.keys(data)

  return (
    <div className="space-y-6 pb-8 max-w-7xl mx-auto w-full">
      {/* 🍏 Top Header */}
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            Vacant Classrooms Finder
          </h1>
          <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-cyan-500/15 text-cyan-400 border border-cyan-500/20">
            Realtime
          </span>
        </div>
        <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
          Find empty campus halls and study spaces based on crowd-sourced timetables
        </p>
      </div>

      {/* Selector Filters Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
        <Select value={block} onValueChange={setBlock}>
          <SelectTrigger className="h-11 rounded-2xl glass-input border-white/20 font-semibold">
            <SelectValue placeholder="Select Block" />
          </SelectTrigger>
          <SelectContent className="glass-card rounded-2xl border-white/20 backdrop-blur-2xl">
            <SelectGroup>
              {BLOCKS.map(b => <SelectItem key={b} value={b}>{b} Block</SelectItem>)}
            </SelectGroup>
          </SelectContent>
        </Select>

        <Select value={day} onValueChange={setDay}>
          <SelectTrigger className="h-11 rounded-2xl glass-input border-white/20 font-semibold">
            <SelectValue placeholder="Select Day" />
          </SelectTrigger>
          <SelectContent className="glass-card rounded-2xl border-white/20 backdrop-blur-2xl">
            <SelectGroup>
              {DAYS.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
            </SelectGroup>
          </SelectContent>
        </Select>

        <Select value={slot} onValueChange={setSlot}>
          <SelectTrigger className="h-11 rounded-2xl glass-input border-white/20 font-semibold font-mono">
            <SelectValue placeholder="Select Slot" />
          </SelectTrigger>
          <SelectContent className="glass-card rounded-2xl border-white/20 backdrop-blur-2xl">
            <SelectGroup>
              {SLOTS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>

      {availability ? (
        <Card className="relative overflow-hidden glass-card rounded-[2.5rem] border border-amber-500/30 shadow-2xl p-6 text-center">
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-amber-400/50 to-transparent" />
          <CardContent className="flex min-h-56 flex-col items-center justify-center p-6 text-center">
            <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mb-4">
              <DoorClosed className="h-7 w-7" />
            </div>
            <h2 className="text-lg font-bold text-foreground">Classroom Indexing in Progress</h2>
            <p className="mt-2 max-w-md text-xs sm:text-sm text-muted-foreground leading-relaxed">
              We require at least {availability.minimumRequired} collected timetables to reliably calculate vacant rooms for this slot.
            </p>
            <div className="mt-4 rounded-full border border-amber-500/30 bg-amber-500/10 px-4 py-1.5 text-xs font-mono font-bold text-amber-400">
              {availability.timetableCount} / {availability.minimumRequired} timetables indexed
            </div>
          </CardContent>
        </Card>
      ) : error ? (
        <div className="p-8 rounded-[2rem] glass-card border border-red-500/30 text-center text-red-400 text-sm max-w-md mx-auto">
          {error}
        </div>
      ) : floors.length === 0 && !loading ? (
        <div className="flex flex-col items-center justify-center h-56 rounded-[2.5rem] glass-card border border-white/20 text-muted-foreground">
          <DoorClosed className="h-10 w-10 mb-2 opacity-40 text-cyan-400" />
          <p className="text-sm font-semibold text-foreground">No Empty Classrooms Found</p>
          <p className="text-xs text-muted-foreground mt-0.5">All scheduled halls are currently in use for this time slot.</p>
        </div>
      ) : (
        <Tabs value={activeFloor ?? undefined} onValueChange={setActiveFloor} className="space-y-4">
          <TabsList className="w-full flex overflow-x-auto no-scrollbar justify-start p-1.5 glass-dock rounded-2xl border border-white/15">
            {floors.map(floor => (
              <TabsTrigger 
                key={floor} 
                value={floor} 
                className="flex-shrink-0 min-w-[80px] md:min-w-[100px] rounded-xl text-xs font-semibold data-[state=active]:bg-white/20 dark:data-[state=active]:bg-white/15 data-[state=active]:text-foreground data-[state=active]:border data-[state=active]:border-white/20 shadow-sm"
              >
                {floor} Floor
              </TabsTrigger>
            ))}
          </TabsList>

          {floors.map(floor => (
            <TabsContent key={floor} value={floor} className="mt-4">
              {loading ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <div key={i} className="h-28 rounded-2xl glass-card border border-white/10 animate-pulse" />
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  {data[floor]?.map(item => (
                    <Card 
                      key={item.room} 
                      className="group relative overflow-hidden glass-card rounded-[2rem] border border-white/20 shadow-lg text-center p-5 hover:border-cyan-400/40 hover:shadow-cyan-500/10 hover:shadow-xl transition-all duration-300"
                    >
                      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-cyan-400/40 to-transparent" />
                      
                      <div className="flex items-center justify-center gap-1.5 mb-2">
                        <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                        <span className="text-[10px] uppercase font-bold text-emerald-400">Available</span>
                      </div>
                      
                      <h3 className="text-xl font-bold font-mono text-foreground tracking-tight">
                        {block} {item.room}
                      </h3>
                      
                      <p className="text-xs text-muted-foreground capitalize mt-1 px-2 py-0.5 rounded-full bg-white/5 border border-white/10 inline-block">
                        {item.type || "Classroom"}
                      </p>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          ))}
        </Tabs>
      )}

      {/* Accuracy Notice */}
      <div className="p-4 rounded-2xl bg-white/5 border border-white/10 flex items-center gap-2.5 text-xs text-muted-foreground">
        <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0" />
        <span>
          Classroom availability is crowdsourced from indexed student timetables. Some rooms might be booked for ad-hoc events or labs.
        </span>
      </div>
    </div>
  )
}
