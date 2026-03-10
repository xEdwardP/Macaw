import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { Mail, Lock, User, GraduationCap, BookOpen, Bird } from 'lucide-react'
import { authService } from '../../services/auth.service'
import { useAuthStore } from '../../store/authStore'

const schema = z.object({
  name:     z.string().min(2, 'Nombre muy corto'),
  email:    z.string().email('Email inválido'),
  password: z.string().min(6, 'Mínimo 6 caracteres'),
  role:     z.enum(['student', 'tutor']),
  career:   z.string().min(2, 'Ingresa tu carrera'),
})

export default function Register() {
  const navigate = useNavigate()
  const setAuth  = useAuthStore((s) => s.setAuth)
  const [params] = useSearchParams()

  const { register, handleSubmit, watch, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { role: params.get('role') || 'student' }
  })

  const selectedRole = watch('role')

  const { mutate, isPending } = useMutation({
    mutationFn: authService.register,
    onSuccess: ({ data }) => {
      setAuth(data.data.user, data.data.token)
      toast.success('Cuenta creada exitosamente')
      navigate('/dashboard')
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Error al crear la cuenta')
    }
  })

  const fields = [
    { id: 'name',     label: 'Nombre completo',     type: 'text',     placeholder: 'Juan Pérez',          icon: User },
    { id: 'email',    label: 'Correo universitario', type: 'email',    placeholder: 'juan@uni.edu',        icon: Mail },
    { id: 'career',   label: 'Carrera',              type: 'text',     placeholder: 'Ing. en Sistemas',    icon: BookOpen },
    { id: 'password', label: 'Contraseña',           type: 'password', placeholder: '••••••••',            icon: Lock },
  ]

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-10">
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 w-full max-w-md">

        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2 justify-center">
            <Bird className="text-orange-600" size={32} />
            <span className="text-2xl font-bold text-orange-600">Macaw</span>
          </Link>
          <h2 className="text-2xl font-bold text-gray-900 mt-4">Crear cuenta</h2>
          <p className="text-gray-500 text-sm mt-1">Únete a la comunidad Macaw</p>
        </div>

        <form onSubmit={handleSubmit(mutate)} className="space-y-4">

          <div className="grid grid-cols-2 gap-3">
            <label className="relative cursor-pointer">
              <input
                {...register('role')}
                type="radio"
                value="student"
                className="peer sr-only"
              />
              <div className={`border-2 rounded-lg p-3 text-center transition-all
                ${selectedRole === 'student'
                  ? 'border-orange-500 bg-orange-50'
                  : 'border-gray-200 hover:border-gray-300'}`}
              >
                <BookOpen className={`mx-auto mb-1 ${selectedRole === 'student' ? 'text-orange-600' : 'text-gray-400'}`} size={22} />
                <div className="text-sm font-medium text-gray-700">Estudiante</div>
              </div>
            </label>

            <label className="relative cursor-pointer">
              <input
                {...register('role')}
                type="radio"
                value="tutor"
                className="peer sr-only"
              />
              <div className={`border-2 rounded-lg p-3 text-center transition-all
                ${selectedRole === 'tutor'
                  ? 'border-orange-500 bg-orange-50'
                  : 'border-gray-200 hover:border-gray-300'}`}
              >
                <GraduationCap className={`mx-auto mb-1 ${selectedRole === 'tutor' ? 'text-orange-600' : 'text-gray-400'}`} size={22} />
                <div className="text-sm font-medium text-gray-700">Tutor</div>
              </div>
            </label>
          </div>

          {fields.map(({ id, label, type, placeholder, icon: Icon }) => (
            <div key={id}>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {label}
              </label>
              <div className="relative">
                <Icon className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                <input
                  {...register(id)}
                  type={type}
                  placeholder={placeholder}
                  className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg
                  focus:outline-none focus:ring-2 focus:ring-orange-500
                  focus:border-transparent transition-all"
                />
              </div>
              {errors[id] && (
                <p className="text-red-500 text-xs mt-1">{errors[id].message}</p>
              )}
            </div>
          ))}

          <button
            type="submit"
            disabled={isPending}
            className="w-full py-3 bg-orange-600 hover:bg-orange-700
            text-white font-medium rounded-lg transition-colors
            disabled:opacity-50 disabled:cursor-not-allowed mt-2"
          >
            {isPending ? 'Creando cuenta...' : 'Crear cuenta gratis'}
          </button>
        </form>

        <p className="text-center text-sm text-gray-500 mt-6">
          Ya tienes cuenta?{' '}
          <Link to="/login" className="text-orange-600 font-medium hover:underline">
            Inicia sesión
          </Link>
        </p>
      </div>
    </div>
  )
}