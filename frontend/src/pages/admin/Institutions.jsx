import { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { Building, Plus, Users } from "lucide-react";
import { useInstitutions } from "../../data/useInstitution";
import { INSTITUTION_STATUSES, STATUS_TONES } from "../../domain/institutionTypes";
import { Badge, Button, Card, SkeletonCards } from "../../ui";
import {
  EmptyState,
  FilterBar,
  PageHeader,
  PageShell,
  Pagination,
  SearchInput,
} from "../../patterns";
import Money from "../../domain/Money";

const LIMIT = 10;

export default function AdminInstitutions() {
  const { t } = useTranslation("institution");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);

  const { data, isLoading } = useInstitutions({
    search: search || undefined,
    status: status || undefined,
    page,
    limit: LIMIT,
  });

  const institutions = data?.data || [];

  const filter = (setter) => (value) => {
    setter(value);
    setPage(1);
  };

  return (
    <PageShell>
      <PageHeader
        title={t("list.title")}
        subtitle={t("list.subtitle")}
        actions={
          <Button as={Link} to="/admin/institutions/new">
            <Plus size={16} />
            {t("list.new")}
          </Button>
        }
      />

      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <SearchInput
          value={search}
          onChange={filter(setSearch)}
          placeholder={t("list.searchPlaceholder")}
          label={t("list.searchLabel")}
          className="flex-1"
        />
      </div>

      <FilterBar
        value={status}
        onChange={filter(setStatus)}
        options={[
          { value: "", label: t("list.allStatuses") },
          ...INSTITUTION_STATUSES.map((value) => ({
            value,
            label: t(`status.${value}`),
          })),
        ]}
        className="mb-6"
      />

      {isLoading ? (
        <SkeletonCards count={5} />
      ) : institutions.length === 0 ? (
        <EmptyState
          icon={Building}
          title={t("list.emptyTitle")}
          description={t("list.emptyBody")}
        />
      ) : (
        <>
          <div className="space-y-3">
            {institutions.map((institution, index) => (
              <motion.div
                key={institution.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.03 }}
              >
                <Card className="p-4 sm:p-5">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <Link
                          to={`/admin/institutions/${institution.id}`}
                          className="font-semibold text-content-primary hover:text-brand truncate"
                        >
                          {institution.name}
                        </Link>
                        <Badge tone={STATUS_TONES[institution.status]}>
                          {t(`status.${institution.status}`)}
                        </Badge>
                        <Badge tone="neutral">
                          {t(`units:institutionType.${institution.type}`)}
                        </Badge>
                      </div>

                      <p className="text-sm text-content-secondary mt-0.5">
                        {institution.domain}
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center justify-end gap-4 sm:gap-6">
                      <div className="text-right">
                        <span className="flex items-center gap-1 text-sm font-medium text-content-primary">
                          <Users size={13} className="text-content-muted" />
                          {institution._count?.users ?? 0}
                        </span>
                        <p className="text-xs text-content-muted">
                          {t("list.accounts")}
                        </p>
                      </div>

                      <div className="text-right">
                        <Money
                          value={institution.balance}
                          currency={institution.currencyCode}
                          className="block font-semibold text-brand"
                        />
                        <p className="text-xs text-content-muted">
                          {t("list.balance")}
                        </p>
                      </div>

                      <Button
                        as={Link}
                        to={`/admin/institutions/${institution.id}`}
                        variant="secondary"
                        size="sm"
                      >
                        {t("common:action.seeDetails")}
                      </Button>
                    </div>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>

          <Pagination
            page={page}
            totalPages={data?.totalPages || 1}
            total={data?.total || 0}
            limit={LIMIT}
            onChange={setPage}
            noun={t("list.noun")}
          />
        </>
      )}

    </PageShell>
  );
}
