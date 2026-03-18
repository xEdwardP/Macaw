import { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Bird,
  Users,
  BookOpen,
  Star,
  ArrowRight,
  CheckCircle,
  Zap,
  Shield,
  Clock,
  Mail,
  Phone,
  Building2,
} from "lucide-react";

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 24 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] },
});

const stagger = {
  animate: { transition: { staggerChildren: 0.08 } },
};

export default function Landing() {
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({ name: "", university: "", message: "" });

  const setField = (key) => (e) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleContact = (e) => {
    e.preventDefault();
    window.location.href = `mailto:soportemacaw@outlook.com?subject=Interes universidad: ${form.university}&body=Nombre: ${form.name}%0AUniversidad: ${form.university}%0A%0A${form.message}`;
    setSubmitted(true);
  };

  return (
    <div className="min-h-screen bg-white overflow-x-hidden">
      <motion.nav
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="flex items-center justify-between px-6 md:px-12 py-5 max-w-7xl mx-auto"
      >
        <div className="flex items-center gap-2">
          <Bird className="text-orange-500" size={28} />
          <span className="text-xl font-bold text-gray-900 tracking-tight">
            Macaw
          </span>
        </div>
        <div className="flex items-center gap-3">
          <Link
            to="/login"
            className="hidden sm:block px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
          >
            Iniciar sesion
          </Link>
          <Link
            to="/register"
            className="px-4 py-2 text-sm font-medium bg-orange-500 hover:bg-orange-600 text-white rounded-lg transition-colors"
          >
            Registrarse
          </Link>
        </div>
      </motion.nav>

      <section className="max-w-7xl mx-auto px-6 md:px-12 pt-16 md:pt-24 pb-20">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <motion.div {...fadeUp(0.1)}>
            <span className="inline-flex items-center gap-2 bg-orange-50 text-orange-600 text-xs font-semibold px-3 py-1.5 rounded-full mb-6 border border-orange-100">
              <Bird size={12} />
              Tutorias peer-to-peer universitarias
            </span>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-gray-900 leading-tight tracking-tight mb-6">
              Aprende de quienes{" "}
              <span className="text-orange-500">ya lo lograron</span>
            </h1>
            <p className="text-lg text-gray-500 leading-relaxed mb-8 max-w-lg">
              Conectamos estudiantes con tutores de su misma universidad.
              Reserva sesiones, paga de forma segura y mejora tu rendimiento
              academico.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 mb-10">
              <Link
                to="/register"
                className="flex items-center justify-center gap-2 px-6 py-3 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-xl transition-all hover:shadow-lg hover:shadow-orange-200 text-sm"
              >
                Buscar tutor
                <ArrowRight size={16} />
              </Link>
              <Link
                to="/register?role=tutor"
                className="flex items-center justify-center gap-2 px-6 py-3 border border-gray-200 hover:border-orange-300 text-gray-700 font-semibold rounded-xl transition-colors text-sm hover:bg-orange-50"
              >
                Quiero ser tutor
              </Link>
            </div>
            <div className="flex flex-wrap items-center gap-6">
              {[
                { icon: CheckCircle, text: "Pago seguro con PayPal" },
                { icon: Shield, text: "Tutores verificados" },
                { icon: Clock, text: "Sesiones en tiempo real" },
              ].map(({ icon: Icon, text }) => (
                <div
                  key={text}
                  className="flex items-center gap-2 text-sm text-gray-500"
                >
                  <Icon size={14} className="text-orange-500 flex-shrink-0" />
                  {text}
                </div>
              ))}
            </div>
          </motion.div>

          <motion.div {...fadeUp(0.25)} className="relative">
            <div className="absolute inset-0 bg-gradient-to-br from-orange-100 to-orange-50 rounded-3xl -rotate-2" />
            <div className="relative bg-white rounded-3xl border border-gray-100 shadow-xl p-8">
              <div className="grid grid-cols-3 gap-4 mb-8">
                {[
                  { value: "500+", label: "Tutores activos", icon: Users },
                  {
                    value: "2K+",
                    label: "Sesiones completadas",
                    icon: BookOpen,
                  },
                  { value: "4.9", label: "Calificacion promedio", icon: Star },
                ].map(({ value, label, icon: Icon }) => (
                  <div
                    key={label}
                    className="text-center p-4 bg-orange-50 rounded-2xl"
                  >
                    <Icon className="mx-auto text-orange-500 mb-2" size={20} />
                    <div className="text-2xl font-bold text-gray-900">
                      {value}
                    </div>
                    <div className="text-xs text-gray-500 mt-1 leading-tight">
                      {label}
                    </div>
                  </div>
                ))}
              </div>
              <div className="bg-gray-50 rounded-2xl p-4 mb-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-full bg-orange-500 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                    EP
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">
                      Edward Pineda
                    </p>
                    <p className="text-xs text-gray-500">
                      Calculo I · Ing. Sistemas
                    </p>
                  </div>
                  <div className="ml-auto flex items-center gap-1">
                    <Star
                      size={12}
                      className="text-yellow-400 fill-yellow-400"
                    />
                    <span className="text-xs font-semibold">4.9</span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500">
                    Proxima sesion: Hoy 3:00 PM
                  </span>
                  <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">
                    Confirmada
                  </span>
                </div>
              </div>
              <div className="bg-gray-50 rounded-2xl p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                    JB
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">
                      José Boanerges
                    </p>
                    <p className="text-xs text-gray-500">
                      Algebra Lineal · Economia
                    </p>
                  </div>
                  <div className="ml-auto flex items-center gap-1">
                    <Star
                      size={12}
                      className="text-yellow-400 fill-yellow-400"
                    />
                    <span className="text-xs font-semibold">5.0</span>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      <section className="bg-gray-50 py-20">
        <div className="max-w-7xl mx-auto px-6 md:px-12">
          <motion.div {...fadeUp(0)} className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900 mb-4">
              Como funciona?
            </h2>
            <p className="text-gray-500 max-w-xl mx-auto">
              En tres pasos simples puedes tener tu primera sesion de tutoria.
            </p>
          </motion.div>
          <motion.div
            variants={stagger}
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
            className="grid grid-cols-1 md:grid-cols-3 gap-6"
          >
            {[
              {
                step: "01",
                title: "Encuentra tu tutor",
                desc: "Busca tutores de tu universidad por materia, calificacion y disponibilidad.",
                icon: Users,
                color: "bg-orange-50 text-orange-500",
              },
              {
                step: "02",
                title: "Reserva una sesion",
                desc: "Elige el horario que mejor te convenga y paga de forma segura con PayPal.",
                icon: BookOpen,
                color: "bg-blue-50 text-blue-500",
              },
              {
                step: "03",
                title: "Aprende en tiempo real",
                desc: "Conectate a la videollamada, aprende y confirma la sesion cuando termines.",
                icon: Zap,
                color: "bg-green-50 text-green-500",
              },
            ].map(({ step, title, desc, icon: Icon, color }) => (
              <motion.div
                key={step}
                variants={fadeUp()}
                className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm"
              >
                <div className="flex items-center gap-3 mb-4">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}
                  >
                    <Icon size={20} />
                  </div>
                  <span className="text-xs font-bold text-gray-300 tracking-widest">
                    {step}
                  </span>
                </div>
                <h3 className="font-bold text-gray-900 mb-2">{title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      <section className="py-20">
        <div className="max-w-7xl mx-auto px-6 md:px-12">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, x: -24 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <span className="inline-flex items-center gap-2 bg-blue-50 text-blue-600 text-xs font-semibold px-3 py-1.5 rounded-full mb-6 border border-blue-100">
                Para universidades
              </span>
              <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900 mb-4 leading-tight">
                Reduce la desercion estudiantil con datos reales
              </h2>
              <p className="text-gray-500 mb-8 leading-relaxed">
                Macaw le da a tu universidad analytics academicos en tiempo
                real, herramientas de subsidios para estudiantes en riesgo y un
                sistema de tutorias que funciona.
              </p>
              <div className="space-y-3 mb-8">
                {[
                  "Dashboard con analytics por facultad",
                  "Subsidios directos a estudiantes en riesgo",
                  "Tutores verificados de tu misma institucion",
                  "Reportes de sesiones y rendimiento",
                ].map((item) => (
                  <div
                    key={item}
                    className="flex items-center gap-3 text-sm text-gray-700"
                  >
                    <CheckCircle
                      size={16}
                      className="text-orange-500 flex-shrink-0"
                    />
                    {item}
                  </div>
                ))}
              </div>
              <a
                href="#contacto"
                className="inline-flex items-center gap-2 px-6 py-3 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-xl transition-colors text-sm"
              >
                Solicitar informacion
                <ArrowRight size={16} />
              </a>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 24 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="grid grid-cols-2 gap-4"
            >
              {[
                {
                  label: "Reduccion de desercion",
                  value: "23%",
                  color: "text-orange-500",
                },
                {
                  label: "Satisfaccion estudiantil",
                  value: "94%",
                  color: "text-blue-500",
                },
                {
                  label: "Costo vs solucion propia",
                  value: "80%",
                  color: "text-green-500",
                },
                {
                  label: "Tiempo de implementacion",
                  value: "1 dia",
                  color: "text-purple-500",
                },
              ].map(({ label, value, color }) => (
                <div
                  key={label}
                  className="bg-gray-50 rounded-2xl p-6 border border-gray-100"
                >
                  <div className={`text-2xl font-extrabold mb-1 ${color}`}>
                    {value}
                  </div>
                  <div className="text-xs text-gray-500">{label}</div>
                </div>
              ))}
            </motion.div>
          </div>
        </div>
      </section>

      <section id="contacto" className="bg-gray-50 py-20">
        <div className="max-w-7xl mx-auto px-6 md:px-12">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
            <motion.div
              initial={{ opacity: 0, x: -24 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <span className="inline-flex items-center gap-2 bg-orange-50 text-orange-600 text-xs font-semibold px-3 py-1.5 rounded-full mb-6 border border-orange-100">
                Contacto
              </span>
              <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900 mb-4 leading-tight">
                Tu universidad quiere unirse?
              </h2>
              <p className="text-gray-500 mb-8 leading-relaxed">
                Contactanos y te mostramos como Macaw puede transformar la
                experiencia academica de tus estudiantes. Respondemos en menos
                de 24 horas.
              </p>
              <div className="space-y-4">
                {[
                  {
                    icon: Mail,
                    label: "Email",
                    value: "soportemacaw@outlook.com",
                  },
                  { icon: Phone, label: "WhatsApp", value: "+504 9776-9485" },
                  {
                    icon: Building2,
                    label: "Sede",
                    value: "Santa Rosa de Copán, Honduras",
                  },
                ].map(({ icon: Icon, label, value }) => (
                  <div key={label} className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center flex-shrink-0">
                      <Icon size={18} className="text-orange-500" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-400">{label}</p>
                      <p className="text-sm font-medium text-gray-900">
                        {value}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 24 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              {submitted ? (
                <div className="bg-green-50 border border-green-100 rounded-2xl p-10 text-center">
                  <CheckCircle
                    className="mx-auto text-green-500 mb-4"
                    size={40}
                  />
                  <h3 className="text-lg font-bold text-gray-900 mb-2">
                    Mensaje enviado!
                  </h3>
                  <p className="text-sm text-gray-500">
                    Nos pondremos en contacto contigo en menos de 24 horas.
                  </p>
                </div>
              ) : (
                <form
                  onSubmit={handleContact}
                  className="bg-white border border-gray-100 rounded-2xl shadow-sm p-8 space-y-4"
                >
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Nombre completo
                    </label>
                    <input
                      value={form.name}
                      onChange={setField("name")}
                      required
                      placeholder="Ej: Dr. Juan Martinez"
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Universidad
                    </label>
                    <input
                      value={form.university}
                      onChange={setField("university")}
                      required
                      placeholder="Ej: Universidad Nacional Autonoma"
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Mensaje
                    </label>
                    <textarea
                      value={form.message}
                      onChange={setField("message")}
                      rows={4}
                      placeholder="Cuentanos sobre tu universidad y que necesitas..."
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm resize-none"
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full py-3 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-xl transition-colors text-sm"
                  >
                    Enviar mensaje
                  </button>
                </form>
              )}
            </motion.div>
          </div>
        </div>
      </section>

      <section className="py-20 px-6 md:px-12">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="max-w-3xl mx-auto bg-orange-500 rounded-3xl p-10 md:p-14 text-center"
        >
          <Bird
            className="mx-auto text-white mb-4"
            size={36}
            style={{ opacity: 0.6 }}
          />
          <h2 className="text-3xl md:text-4xl font-extrabold text-white mb-4">
            Empieza hoy mismo
          </h2>
          <p className="text-orange-100 mb-8 max-w-lg mx-auto">
            Unete a cientos de estudiantes que ya estan mejorando su rendimiento
            academico con Macaw.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              to="/register"
              className="px-8 py-3 bg-white text-orange-600 font-bold rounded-xl hover:bg-orange-50 transition-colors text-sm"
            >
              Crear cuenta gratis
            </Link>
            <Link
              to="/login"
              className="px-8 py-3 border border-white text-white font-semibold rounded-xl hover:bg-white hover:text-orange-500 transition-colors text-sm"
              style={{ borderColor: "rgba(255,255,255,0.3)" }}
            >
              Ya tengo cuenta
            </Link>
          </div>
        </motion.div>
      </section>

      <footer className="border-t border-gray-100 py-8 px-6 md:px-12">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Bird className="text-orange-500" size={20} />
            <span className="font-bold text-gray-900 text-sm">Macaw</span>
          </div>
          <p className="text-xs text-gray-400">
            2025 Macaw · Plataforma de tutorias universitarias · UNICAH
          </p>
          <div className="flex gap-4 text-xs text-gray-400">
            <a
              href="#contacto"
              className="hover:text-gray-600 transition-colors"
            >
              Contacto
            </a>
            <Link to="/login" className="hover:text-gray-600 transition-colors">
              Iniciar sesion
            </Link>
            <Link
              to="/register"
              className="hover:text-gray-600 transition-colors"
            >
              Registrarse
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
