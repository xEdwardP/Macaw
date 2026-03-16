import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { DollarSign, Calendar, Plus } from "lucide-react";
import api from "../../services/api";
import UniversityRechargeModal from "../../components/wallet/UniversityRechargeModal";

export default function UniversitySubsidies() {
  const queryClient = useQueryClient();
  const [showRecharge, setShowRecharge] = useState(false);

  const { data: subsidies, isLoading } = useQuery({
    queryKey: ["subsidies"],
    queryFn: () => api.get("/universities/subsidies").then((r) => r.data.data),
  });

  const { data: analytics } = useQuery({
    queryKey: ["analytics"],
    queryFn: () => api.get("/universities/analytics").then((r) => r.data.data),
  });

  const total = (subsidies || []).reduce((sum, s) => sum + s.amount, 0);
  const universityBalance = analytics?.overview?.universityBalance || 0;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-3xl font-bold text-gray-900">Subsidios</h1>
          <button
            onClick={() => setShowRecharge(true)}
            className="flex items-center gap-2 px-4 py-2 bg-orange-600
            hover:bg-orange-700 text-white rounded-xl transition-colors font-medium text-sm"
          >
            <Plus size={16} />
            Recargar con PayPal
          </button>
        </div>
        <p className="text-gray-500 mb-8">
          Historial de subsidios aplicados a estudiantes
        </p>

        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-orange-600 rounded-xl p-6 text-white">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign size={20} />
              <span className="text-sm opacity-80">Total subsidiado</span>
            </div>
            <div className="text-4xl font-bold">${total.toFixed(2)}</div>
            <div className="text-sm opacity-70 mt-1">
              {(subsidies || []).length} subsidios aplicados
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign size={20} className="text-green-600" />
              <span className="text-sm text-gray-500">Balance disponible</span>
            </div>
            <div
              className={`text-4xl font-bold ${universityBalance > 0 ? "text-green-600" : "text-gray-400"}`}
            >
              ${universityBalance?.toFixed(2) || "0.00"}
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="bg-white rounded-xl p-5 animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-1/3 mb-2" />
                <div className="h-3 bg-gray-200 rounded w-1/2" />
              </div>
            ))}
          </div>
        ) : (subsidies || []).length === 0 ? (
          <div className="text-center py-20">
            <DollarSign className="mx-auto text-gray-300 mb-4" size={48} />
            <h3 className="text-lg font-medium text-gray-900">
              No hay subsidios aún
            </h3>
            <p className="text-gray-500 mt-1">
              Ve a la lista de estudiantes para aplicar subsidios
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {(subsidies || []).map((subsidy, i) => {
              const date = new Date(subsidy.appliedAt).toLocaleDateString(
                "es-HN",
                {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                },
              );
              return (
                <motion.div
                  key={subsidy.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03 }}
                  className="bg-white rounded-xl border border-gray-100 shadow-sm p-5"
                >
                  <div className="flex items-center gap-4">
                    <div
                      className="w-10 h-10 rounded-full bg-orange-100 flex items-center
                    justify-center text-orange-600 font-bold flex-shrink-0"
                    >
                      {subsidy.student.name.charAt(0)}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-medium text-gray-900">
                        {subsidy.student.name}
                      </h3>
                      <p className="text-sm text-gray-500">
                        {subsidy.student.email}
                      </p>
                      {subsidy.reason && (
                        <p className="text-xs text-gray-400 mt-1">
                          {subsidy.reason}
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-green-600">
                        +${subsidy.amount.toFixed(2)}
                      </p>
                      <div className="flex items-center gap-1 text-xs text-gray-400 mt-1">
                        <Calendar size={12} />
                        {date}
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {showRecharge && (
        <UniversityRechargeModal
          currentBalance={universityBalance}
          onClose={() => setShowRecharge(false)}
          onSuccess={() => {
            queryClient.invalidateQueries(["analytics"]);
            queryClient.invalidateQueries(["subsidies"]);
          }}
        />
      )}
    </div>
  );
}
