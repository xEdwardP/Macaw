import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Bird, Users, BookOpen, Star } from 'lucide-react'

export default function Landing() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-orange-100">

      <nav className="flex items-center justify-between px-8 py-5 max-w-7xl mx-auto">
        <div className="flex items-center gap-2">
          <Bird className="text-orange-600" size={32} />
          <span className="text-2xl font-bold text-orange-600">Macaw</span>
        </div>
        <div className="flex gap-4">
          <Link
            to="/login"
            className="px-4 py-2 rounded-lg border border-gray-300
            text-gray-700 hover:bg-gray-50 transition-colors font-medium"
          >
            Iniciar sesión
          </Link>
          <Link
            to="/register"
            className="px-4 py-2 rounded-lg bg-orange-600
            text-white hover:bg-orange-700 transition-colors font-medium"
          >
            Registrarse
          </Link>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-8 pt-20 pb-32 text-center">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <span className="inline-flex items-center gap-2 bg-orange-100 text-orange-700
          text-sm font-medium px-4 py-1 rounded-full mb-6">
            <Bird size={14} />
            Marketplace de tutorías universitarias
          </span>

          <h1 className="text-6xl font-extrabold text-gray-900 leading-tight mb-6">
            Aprende de quienes <br />
            <span className="text-orange-600">ya lo lograron</span>
          </h1>

          <p className="text-xl text-gray-600 max-w-2xl mx-auto mb-10">
            Conectamos estudiantes con tutores de su misma universidad.
            Reserva sesiones, paga de forma segura y mejora tu rendimiento académico.
          </p>

          <div className="flex gap-4 justify-center">
            <Link
              to="/register"
              className="px-8 py-3 text-lg rounded-lg bg-orange-600
              text-white hover:bg-orange-700 transition-colors font-medium"
            >
              Buscar tutor
            </Link>
            <Link
              to="/register?role=tutor"
              className="px-8 py-3 text-lg rounded-lg border border-gray-300
              text-gray-700 hover:bg-gray-50 transition-colors font-medium"
            >
              Ser tutor
            </Link>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="grid grid-cols-3 gap-8 max-w-2xl mx-auto mt-24"
        >
          {[
            { value: '500+',   label: 'Tutores activos',       icon: Users },
            { value: '2,000+', label: 'Sesiones completadas',  icon: BookOpen },
            { value: '4.9',    label: 'Calificación promedio', icon: Star },
          ].map(({ value, label, icon: Icon }) => (
            <div
              key={label}
              className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 text-center"
            >
              <Icon className="mx-auto text-orange-600 mb-2" size={24} />
              <div className="text-3xl font-bold text-orange-600">{value}</div>
              <div className="text-sm text-gray-500 mt-1">{label}</div>
            </div>
          ))}
        </motion.div>
      </main>
    </div>
  )
}