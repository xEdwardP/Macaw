import { motion } from "framer-motion";
import { Calendar, Clock, User, BookOpen } from "lucide-react";
import Card from "../ui/Card";
import Money from "./Money";
import DateTime from "./DateTime";
import SessionStatusBadge from "./SessionStatusBadge";

export default function SessionCard({
  session,
  counterpartLabel = "Tutor",
  counterpart,
  actions,
  index = 0,
}) {
  const person = counterpart || session.tutor;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.03 }}
    >
      <Card>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <BookOpen size={14} className="text-content-muted flex-shrink-0" />
              <h3 className="font-semibold text-content-primary truncate">
                {session.subject?.name}
              </h3>
            </div>

            <p className="text-sm text-content-secondary flex items-center gap-1.5">
              <User size={13} className="flex-shrink-0" />
              {counterpartLabel}: {person?.name}
            </p>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-sm text-content-secondary">
              <span className="flex items-center gap-1.5">
                <Calendar size={13} />
                <DateTime value={session.date} />
              </span>
              <span className="flex items-center gap-1.5">
                <Clock size={13} />
                {session.startTime} - {session.endTime}
              </span>
            </div>
          </div>

          <div className="text-right flex-shrink-0">
            <SessionStatusBadge status={session.status} />
            <Money
              value={session.price}
              currency={session.currency}
              className="block font-bold text-content-primary mt-2"
            />
          </div>
        </div>

        {actions && (
          <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-line-subtle">
            {actions}
          </div>
        )}
      </Card>
    </motion.div>
  );
}
