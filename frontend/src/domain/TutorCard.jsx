import { Link } from "react-router-dom";
import { Star, BookOpen } from "lucide-react";
import { motion } from "framer-motion";
import Card from "../ui/Card";
import Badge from "../ui/Badge";
import Avatar from "../ui/Avatar";
import Money from "./Money";

export default function TutorCard({ tutor, index = 0, footer }) {
  const profile = tutor.tutorProfile || {};
  const subjects = profile.subjects || [];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04 }}
    >
      <Card className="h-full flex flex-col">
        <div className="flex items-start gap-3">
          <Avatar name={tutor.name} src={tutor.avatar} />
          <div className="min-w-0 flex-1">
            <h3 className="font-semibold text-content-primary truncate">{tutor.name}</h3>
            <p className="text-sm text-content-secondary truncate">
              {tutor.academicUnit?.name || tutor.program || "Tutor"}
            </p>
            <div className="flex items-center gap-3 mt-1.5 text-sm">
              <span className="flex items-center gap-1 text-rating">
                <Star size={14} fill="currentColor" />
                {Number(profile.averageRating || 0).toFixed(1)}
              </span>
              <span className="text-content-muted">
                {profile.totalSessions || 0} sesiones
              </span>
            </div>
          </div>
          <Money
            value={profile.hourlyRate}
            className="font-bold text-brand flex-shrink-0"
          />
        </div>

        {subjects.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-4">
            {subjects.slice(0, 3).map((entry) => (
              <Badge key={entry.id} tone="neutral">
                <BookOpen size={11} />
                {entry.subject?.name}
              </Badge>
            ))}
            {subjects.length > 3 && (
              <Badge tone="neutral">+{subjects.length - 3}</Badge>
            )}
          </div>
        )}

        <div className="mt-auto pt-4">
          {footer || (
            <Link
              to={`/tutors/${tutor.id}`}
              className="block w-full text-center py-2 rounded-lg bg-brand-solid text-brand-contrast text-sm font-medium hover:brightness-95"
            >
              Ver perfil
            </Link>
          )}
        </div>
      </Card>
    </motion.div>
  );
}
