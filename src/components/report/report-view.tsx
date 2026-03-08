import type { CommunityReport, NeighborhoodProfile } from '../../types/index';
import { useLanguage } from '../../i18n/context';
import { FlyerLayout } from '../flyer/flyer-layout';
import { toSlug } from '../../utils/slug';

interface ReportViewProps {
  report: CommunityReport | null;
  loading: boolean;
  metrics?: NeighborhoodProfile['metrics'] | null;
  topLanguages?: { language: string; percentage: number }[];
}

export default function ReportView({ report, loading, metrics, topLanguages }: ReportViewProps) {
  const { t } = useLanguage();

  if (loading) {
    return (
      <div role="status" aria-label={t('report.generating')} className="flex flex-col items-center justify-center py-8 text-gray-500">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-gray-300 border-t-blue-600 mb-2" />
        <p className="text-sm text-gray-500">{t('report.generatingBackground') ?? 'Generating your report...'}</p>
        <span className="sr-only">{t('report.generatingSr')}</span>
      </div>
    );
  }

  if (!report) {
    return null;
  }

  const formattedDate = new Date(report.generatedAt).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <>
      <div className="report-content bg-white rounded-lg shadow p-6 max-w-2xl mx-auto">
        {/* Header */}
        <div className="border-b border-gray-200 pb-4 mb-4">
          <h2 className="text-2xl font-bold text-gray-900">
            {report.neighborhoodName}
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            {t('report.communityReport')} &middot; {report.language}
          </p>
          <p className="text-xs text-gray-400 mt-0.5">
            Data as of {formattedDate}
          </p>
        </div>

        {/* Welcome / Summary */}
        <section className="mb-5">
          <p className="text-gray-700 leading-relaxed">{report.summary}</p>
        </section>

        {/* Good News */}
        <section className="mb-5">
          <h3 className="text-lg font-semibold text-green-700 mb-2">{t('report.goodNews')}</h3>
          <ul className="list-disc list-inside space-y-1 text-gray-700">
            {report.goodNews.map((item, i) => (
              <li key={i}>{item}</li>
            ))}
          </ul>
        </section>

        {/* Top Issues */}
        <section className="mb-5">
          <h3 className="text-lg font-semibold text-amber-700 mb-2">
            {t('report.topIssues')}
          </h3>
          <ul className="list-disc list-inside space-y-1 text-gray-700">
            {report.topIssues.map((item, i) => (
              <li key={i}>{item}</li>
            ))}
          </ul>
        </section>

        {/* How to Participate */}
        <section className="mb-5">
          <h3 className="text-lg font-semibold text-blue-700 mb-2">
            {t('report.howTo')}
          </h3>
          <ul className="list-disc list-inside space-y-1 text-gray-700">
            {report.howToParticipate.map((item, i) => (
              <li key={i}>{item}</li>
            ))}
          </ul>
        </section>

        {/* Contact Info */}
        <section className="mb-5 bg-gray-50 rounded-md p-4">
          <h3 className="text-lg font-semibold text-gray-800 mb-2">{t('report.contactInfo')}</h3>
          <dl className="space-y-1 text-sm text-gray-700">
            <div className="flex gap-2">
              <dt className="font-medium">{t('report.councilDistrict')}</dt>
              <dd>{report.contactInfo.councilDistrict}</dd>
            </div>
            <div className="flex gap-2">
              <dt className="font-medium">{t('report.phone311')}</dt>
              <dd>{report.contactInfo.phone311}</dd>
            </div>
            <div className="flex gap-2">
              <dt className="font-medium">{t('report.nearestResource')}</dt>
              <dd>{report.contactInfo.anchorLocation}</dd>
            </div>
          </dl>
        </section>

        {/* Print button */}
        <div className="no-print mt-4 text-center">
          <button
            type="button"
            onClick={() => window.print()}
            className="px-5 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
          >
            {t('flyer.print')}
          </button>
        </div>
      </div>

      {/* Flyer layout — OUTSIDE .report-content so print.css can show it */}
      <FlyerLayout
        report={report}
        neighborhoodSlug={toSlug(report.neighborhoodName)}
        metrics={metrics}
        topLanguages={topLanguages}
      />
    </>
  );
}
