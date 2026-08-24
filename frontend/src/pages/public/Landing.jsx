import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "../../ui";
import PreferencesMenu from "../../components/layout/PreferencesMenu";
import {
  SUPPORT_ADDRESS,
  SUPPORT_EMAIL,
  SUPPORT_PHONE,
} from "../../app/contact";
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
  const { t } = useTranslation("landing");
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({ name: "", institution: "", message: "" });

  const setField = (key) => (e) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleContact = (e) => {
    e.preventDefault();
    const subject = t("contact.mailSubject", { institution: form.institution });
    const body = [form.name, form.institution, "", form.message].join("\n");
    window.location.href =
      `mailto:${SUPPORT_EMAIL}?subject=` +
      encodeURIComponent(subject) +
      "&body=" +
      encodeURIComponent(body);
    setSubmitted(true);
  };

  return (
    <div className="min-h-screen bg-surface overflow-x-hidden">
      <motion.nav
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="flex items-center justify-between px-6 md:px-12 py-5 max-w-7xl mx-auto"
      >
        <div className="flex items-center gap-2">
          <Bird className="text-brand" size={28} />
          <span className="text-xl font-bold text-content-primary tracking-tight">
            Macaw
          </span>
        </div>
        <div className="flex items-center gap-3">
          <PreferencesMenu className="hidden sm:flex" />
          <Link
            to="/login"
            className="hidden sm:block px-4 py-2 text-sm font-medium text-content-secondary hover:text-content-primary transition-colors"
          >
            {t("nav.signIn")}
          </Link>
          <Link
            to="/register"
            className="px-4 py-2 text-sm font-medium bg-brand-solid hover:brightness-95 text-brand-contrast rounded-lg transition-colors"
          >
            {t("nav.signUp")}
          </Link>
        </div>
      </motion.nav>

      <section className="max-w-7xl mx-auto px-6 md:px-12 pt-16 md:pt-24 pb-20">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <motion.div {...fadeUp(0.1)}>
            <span className="inline-flex items-center gap-2 bg-brand-surface text-brand text-xs font-semibold px-3 py-1.5 rounded-full mb-6 border border-brand-line">
              <Bird size={12} />
              {t("hero.badge")}
            </span>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-content-primary leading-tight tracking-tight mb-6">
              {t("hero.titleLead")}{" "}
              <span className="text-brand">{t("hero.titleAccent")}</span>
            </h1>
            <p className="text-lg text-content-secondary leading-relaxed mb-8 max-w-lg">
              {t("hero.body")}
            </p>
            <div className="flex flex-col sm:flex-row gap-3 mb-10">
              <Link
                to="/register"
                className="flex items-center justify-center gap-2 px-6 py-3 bg-brand-solid hover:brightness-95 text-brand-contrast font-semibold rounded-xl transition-all hover:shadow-lg text-sm"
              >
                {t("hero.findTutor")}
                <ArrowRight size={16} />
              </Link>
              <Link
                to="/register?role=tutor"
                className="flex items-center justify-center gap-2 px-6 py-3 border border-line-default hover:border-brand text-content-primary font-semibold rounded-xl transition-colors text-sm hover:bg-brand-surface"
              >
                {t("hero.becomeTutor")}
              </Link>
            </div>
            <div className="flex flex-wrap items-center gap-6">
              {[
                { icon: CheckCircle, text: t("hero.securePayment") },
                { icon: Shield, text: t("hero.verifiedTutors") },
                { icon: Clock, text: t("hero.realTime") },
              ].map(({ icon: Icon, text }) => (
                <div
                  key={text}
                  className="flex items-center gap-2 text-sm text-content-secondary"
                >
                  <Icon size={14} className="text-brand flex-shrink-0" />
                  {text}
                </div>
              ))}
            </div>
          </motion.div>

          <motion.div {...fadeUp(0.25)} className="relative">
            <div className="absolute inset-0 bg-brand-surface border border-brand-line rounded-3xl -rotate-2" />
            <div className="relative bg-surface rounded-3xl border border-line-subtle shadow-xl p-8">
              <div className="grid grid-cols-3 gap-4 mb-8">
                {[
                  { value: "500+", label: t("hero.activeTutors"), icon: Users },
                  {
                    value: "2K+",
                    label: t("hero.completedSessions"),
                    icon: BookOpen,
                  },
                  { value: "4.9", label: t("hero.averageRating"), icon: Star },
                ].map(({ value, label, icon: Icon }) => (
                  <div
                    key={label}
                    className="text-center p-4 bg-brand-surface rounded-2xl"
                  >
                    <Icon className="mx-auto text-brand mb-2" size={20} />
                    <div className="text-2xl font-bold text-content-primary">
                      {value}
                    </div>
                    <div className="text-xs text-content-secondary mt-1 leading-tight">
                      {label}
                    </div>
                  </div>
                ))}
              </div>
              <div className="bg-surface-muted rounded-2xl p-4 mb-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-full bg-brand-solid flex items-center justify-center text-brand-contrast font-bold text-sm flex-shrink-0">
                    EP
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-content-primary">
                      Edward Pineda
                    </p>
                    <p className="text-xs text-content-secondary">
                      Calculo I · Ing. Sistemas
                    </p>
                  </div>
                  <div className="ml-auto flex items-center gap-1">
                    <Star
                      size={12}
                      className="text-rating fill-rating"
                    />
                    <span className="text-xs font-semibold">4.9</span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-content-secondary">
                    {t("hero.nextSession")}
                  </span>
                  <span className="text-xs bg-positive-surface text-positive-content px-2 py-0.5 rounded-full font-medium">
                    {t("hero.confirmed")}
                  </span>
                </div>
              </div>
              <div className="bg-surface-muted rounded-2xl p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-info-solid flex items-center justify-center text-on-solid font-bold text-sm flex-shrink-0">
                    JB
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-content-primary">
                      José Boanerges
                    </p>
                    <p className="text-xs text-content-secondary">
                      Algebra Lineal · Economia
                    </p>
                  </div>
                  <div className="ml-auto flex items-center gap-1">
                    <Star
                      size={12}
                      className="text-rating fill-rating"
                    />
                    <span className="text-xs font-semibold">5.0</span>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      <section className="bg-surface-muted py-20">
        <div className="max-w-7xl mx-auto px-6 md:px-12">
          <motion.div {...fadeUp(0)} className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-extrabold text-content-primary mb-4">
              {t("steps.title")}
            </h2>
            <p className="text-content-secondary max-w-xl mx-auto">
              {t("steps.subtitle")}
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
                title: t("steps.one.title"),
                desc: t("steps.one.body"),
                icon: Users,
                color: "bg-brand-surface text-brand",
              },
              {
                step: "02",
                title: t("steps.two.title"),
                desc: t("steps.two.body"),
                icon: BookOpen,
                color: "bg-info-surface text-info-content",
              },
              {
                step: "03",
                title: t("steps.three.title"),
                desc: t("steps.three.body"),
                icon: Zap,
                color: "bg-positive-surface text-positive-content",
              },
            ].map(({ step, title, desc, icon: Icon, color }) => (
              <motion.div
                key={step}
                variants={fadeUp()}
                className="bg-surface rounded-2xl border border-line-subtle p-6 shadow-sm"
              >
                <div className="flex items-center gap-3 mb-4">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}
                  >
                    <Icon size={20} />
                  </div>
                  <span className="text-xs font-bold text-content-muted tracking-widest">
                    {step}
                  </span>
                </div>
                <h3 className="font-bold text-content-primary mb-2">{title}</h3>
                <p className="text-sm text-content-secondary leading-relaxed">{desc}</p>
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
              <span className="inline-flex items-center gap-2 bg-info-surface text-info-content text-xs font-semibold px-3 py-1.5 rounded-full mb-6 border border-info-line">
                {t("institutions.badge")}
              </span>
              <h2 className="text-3xl md:text-4xl font-extrabold text-content-primary mb-4 leading-tight">
                {t("institutions.title")}
              </h2>
              <p className="text-content-secondary mb-8 leading-relaxed">
                {t("institutions.body")}
              </p>
              <div className="space-y-3 mb-8">
                {[
                  t("institutions.point1"),
                  t("institutions.point2"),
                  t("institutions.point3"),
                  t("institutions.point4"),
                ].map((item) => (
                  <div
                    key={item}
                    className="flex items-center gap-3 text-sm text-content-primary"
                  >
                    <CheckCircle
                      size={16}
                      className="text-brand flex-shrink-0"
                    />
                    {item}
                  </div>
                ))}
              </div>
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
                  label: t("institutions.dropoutReduction"),
                  value: "23%",
                  color: "text-brand",
                },
                {
                  label: t("institutions.satisfaction"),
                  value: "94%",
                  color: "text-info-content",
                },
                {
                  label: t("institutions.costVsInHouse"),
                  value: "80%",
                  color: "text-positive-content",
                },
                {
                  label: t("institutions.rolloutTime"),
                  value: "1 dia",
                  color: "text-accent-content",
                },
              ].map(({ label, value, color }) => (
                <div
                  key={label}
                  className="bg-surface-muted rounded-2xl p-6 border border-line-subtle"
                >
                  <div className={`text-2xl font-extrabold mb-1 ${color}`}>
                    {value}
                  </div>
                  <div className="text-xs text-content-secondary">{label}</div>
                </div>
              ))}
            </motion.div>
          </div>
        </div>
      </section>

      <section id="contacto" className="bg-surface-muted py-20">
        <div className="max-w-7xl mx-auto px-6 md:px-12">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
            <motion.div
              initial={{ opacity: 0, x: -24 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <span className="inline-flex items-center gap-2 bg-brand-surface text-brand text-xs font-semibold px-3 py-1.5 rounded-full mb-6 border border-brand-line">
                {t("contact.badge")}
              </span>
              <h2 className="text-3xl md:text-4xl font-extrabold text-content-primary mb-4 leading-tight">
                {t("contact.title")}
              </h2>
              <p className="text-content-secondary mb-8 leading-relaxed">
                {t("contact.body")}
              </p>
              <div className="space-y-4">
                {[
                  { icon: Mail, label: t("contact.email"), value: SUPPORT_EMAIL },
                  {
                    icon: Phone,
                    label: t("contact.whatsapp"),
                    value: SUPPORT_PHONE,
                  },
                  {
                    icon: Building2,
                    label: t("contact.office"),
                    value: SUPPORT_ADDRESS,
                  },
                ].map(({ icon: Icon, label, value }) => (
                  <div key={label} className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-brand-surface flex items-center justify-center flex-shrink-0">
                      <Icon size={18} className="text-brand" />
                    </div>
                    <div>
                      <p className="text-xs text-content-muted">{label}</p>
                      <p className="text-sm font-medium text-content-primary">
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
                <div className="bg-positive-surface border border-positive-line rounded-2xl p-10 text-center">
                  <CheckCircle
                    className="mx-auto text-positive-content mb-4"
                    size={40}
                  />
                  <h3 className="text-lg font-bold text-content-primary mb-2">
                    {t("contact.sent")}
                  </h3>
                  <p className="text-sm text-content-secondary">
                    {t("contact.sentBody")}
                  </p>
                </div>
              ) : (
                <form
                  onSubmit={handleContact}
                  className="bg-surface border border-line-subtle rounded-2xl shadow-sm p-8 space-y-4"
                >
                  <div>
                    <label className="block text-sm font-medium text-content-primary mb-1">
                      {t("contact.name")}
                    </label>
                    <input
                      value={form.name}
                      onChange={setField("name")}
                      required
                      placeholder={t("contact.namePlaceholder")}
                      className="w-full px-4 py-2.5 border border-line-default rounded-xl focus:outline-none focus:ring-2 ring-brand text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-content-primary mb-1">
                      {t("contact.institution")}
                    </label>
                    <input
                      value={form.institution}
                      onChange={setField("institution")}
                      required
                      placeholder={t("contact.institutionPlaceholder")}
                      className="w-full px-4 py-2.5 border border-line-default rounded-xl focus:outline-none focus:ring-2 ring-brand text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-content-primary mb-1">
                      {t("contact.message")}
                    </label>
                    <textarea
                      value={form.message}
                      onChange={setField("message")}
                      rows={4}
                      placeholder={t("contact.messagePlaceholder")}
                      className="w-full px-4 py-2.5 border border-line-default rounded-xl focus:outline-none focus:ring-2 ring-brand text-sm resize-none"
                    />
                  </div>
                  <Button type="submit" block size="lg">
                    {t("contact.send")}
                  </Button>
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
          className="max-w-3xl mx-auto bg-brand-solid rounded-3xl p-10 md:p-14 text-center"
        >
          <Bird
            className="mx-auto text-brand-contrast mb-4"
            size={36}
            style={{ opacity: 0.6 }}
          />
          <h2 className="text-3xl md:text-4xl font-extrabold text-brand-contrast mb-4">
            {t("cta.title")}
          </h2>
          <p className="text-brand-contrast opacity-80 mb-8 max-w-lg mx-auto">
            {t("cta.body")}
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              to="/register"
              className="px-8 py-3 bg-surface text-brand font-bold rounded-xl hover:bg-brand-surface transition-colors text-sm"
            >
              {t("cta.createAccount")}
            </Link>
            <Link
              to="/login"
              className="px-8 py-3 border border-brand-contrast/30 text-brand-contrast font-semibold rounded-xl hover:bg-surface hover:text-brand transition-colors text-sm"
            >
              {t("cta.haveAccount")}
            </Link>
          </div>
        </motion.div>
      </section>

      <footer className="border-t border-line-subtle py-8 px-6 md:px-12">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Bird className="text-brand" size={20} />
            <span className="font-bold text-content-primary text-sm">Macaw</span>
          </div>
          <p className="text-xs text-content-muted">
            {t("footer.rights", { year: new Date().getFullYear() })}
          </p>
          <div className="flex gap-4 text-xs text-content-muted">
            <a
              href="#contacto"
              className="hover:text-content-secondary transition-colors"
            >
              {t("nav.contact")}
            </a>
            <Link to="/login" className="hover:text-content-secondary transition-colors">
              {t("nav.signIn")}
            </Link>
            <Link
              to="/register"
              className="hover:text-content-secondary transition-colors"
            >
              {t("nav.signUp")}
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
