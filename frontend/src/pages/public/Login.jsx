import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Link, useNavigate } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { Mail, Lock, Bird } from 'lucide-react'
import { authService } from '../../services/auth.service'
import { useAuthStore } from '../../store/authStore'

const schema = z.object({
  email:    z.string().email('Email inválido'),
  password: z.string().min(6, 'Mínimo 6 caracteres'),
})

export default function Login() {
  const navigate = useNavigate()
  const setAuth  = useAuthStore((s) => s.setAuth)

  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(schema)
  })

  const { mutate, isPending } = useMutation({
    mutationFn: authService.login,
    onSuccess: ({ data }) => {
      setAuth(data.data.user, data.data.token)
      toast.success(`Bienvenido, ${data.data.user.name}`)
      navigate('/dashboard')
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Credenciales incorrectas')
    }
  })

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 w-full max-w-md">

        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2 justify-center">
            <Bird className="text-orange-600" size={32} />
            <span className="text-2xl font-bold text-orange-600">Macaw</span>
          </Link>
          <h2 className="text-2xl font-bold text-gray-900 mt-4">Iniciar sesión</h2>
          <p className="text-gray-500 text-sm mt-1">Bienvenido de nuevo</p>
        </div>

        <form onSubmit={handleSubmit(mutate)} className="space-y-4">

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Correo electrónico
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              <input
                {...register('email')}
                type="email"
                placeholder="tu@universidad.edu"
                className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg
                focus:outline-none focus:ring-2 focus:ring-orange-500
                focus:border-transparent transition-all"
              />
            </div>
            {errors.email && (
              <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Contraseña
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              <input
                {...register('password')}
                type="password"
                placeholder="••••••••"
                className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg
                focus:outline-none focus:ring-2 focus:ring-orange-500
                focus:border-transparent transition-all"
              />
            </div>
            {errors.password && (
              <p className="text-red-500 text-xs mt-1">{errors.password.message}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={isPending}
            className="w-full py-3 bg-orange-600 hover:bg-orange-700
            text-white font-medium rounded-lg transition-colors
            disabled:opacity-50 disabled:cursor-not-allowed mt-2"
          >
            {isPending ? 'Iniciando sesión...' : 'Iniciar sesión'}
          </button>
        </form>

        <p className="text-center text-sm text-gray-500 mt-6">
          No tienes cuenta?{' '}
          <Link to="/register" className="text-orange-600 font-medium hover:underline">
            Regístrate gratis
          </Link>
        </p>
      </div>
    </div>
  )
}