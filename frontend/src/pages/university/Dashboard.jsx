import { Bird } from 'lucide-react'

export default function Dashboard() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 text-center">
        <Bird className="mx-auto text-orange-600 mb-4" size={48} />
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 mt-2">En construcción</p>
      </div>
    </div>
  )
}