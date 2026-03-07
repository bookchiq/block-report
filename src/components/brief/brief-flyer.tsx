import { QRCodeSVG } from 'qrcode.react';
import type { CommunityBrief } from '../../types/index';
import {
  MegaphoneIcon,
  AlertTriangleIcon,
  HandRaisedIcon,
  PhoneIcon,
  MapPinIcon,
  BuildingIcon,
} from './flyer-icons';

interface BriefFlyerProps {
  brief: CommunityBrief;
  neighborhoodSlug: string;
}

export function BriefFlyer({ brief, neighborhoodSlug }: BriefFlyerProps) {
  const formattedDate = new Date(brief.generatedAt).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const qrUrl = `${window.location.origin}/neighborhood/${neighborhoodSlug}`;

  return (
    <div className="brief-flyer hidden print:block text-black">
      {/* Header Banner */}
      <div className="border-b-4 border-black pb-2 mb-3">
        <p className="text-xs font-bold uppercase tracking-[0.3em]">Block Report</p>
        <h1 className="text-3xl font-black uppercase leading-tight">
          {brief.neighborhoodName}
        </h1>
        <p className="text-sm font-medium">
          Community Brief &middot; {formattedDate} &middot; {brief.language}
        </p>
      </div>

      {/* Summary */}
      <div className="mb-3">
        <p className="text-sm leading-snug">{brief.summary}</p>
      </div>

      {/* Two-column: Good News + Top Issues */}
      <div className="grid grid-cols-2 gap-4 mb-3">
        <div className="flyer-section border-2 border-black rounded p-2">
          <div className="flex items-center gap-1.5 mb-1.5 border-b border-black pb-1">
            <MegaphoneIcon className="w-4 h-4" />
            <h2 className="text-xs font-black uppercase tracking-widest">Good News</h2>
          </div>
          <ul className="text-xs space-y-1 list-none">
            {brief.goodNews.slice(0, 4).map((item, i) => (
              <li key={i} className="flex gap-1">
                <span className="font-bold flex-shrink-0">&bull;</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="flyer-section border-2 border-black rounded p-2">
          <div className="flex items-center gap-1.5 mb-1.5 border-b border-black pb-1">
            <AlertTriangleIcon className="w-4 h-4" />
            <h2 className="text-xs font-black uppercase tracking-widest">Neighbors Report</h2>
          </div>
          <ul className="text-xs space-y-1 list-none">
            {brief.topIssues.slice(0, 4).map((item, i) => (
              <li key={i} className="flex gap-1">
                <span className="font-bold flex-shrink-0">&bull;</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* How to Get Involved — full width */}
      <div className="flyer-section border-2 border-black rounded p-2 mb-3">
        <div className="flex items-center gap-1.5 mb-1.5 border-b border-black pb-1">
          <HandRaisedIcon className="w-4 h-4" />
          <h2 className="text-xs font-black uppercase tracking-widest">Get Involved</h2>
        </div>
        <ul className="text-xs space-y-1 list-none">
          {brief.howToParticipate.slice(0, 4).map((item, i) => (
            <li key={i} className="flex gap-1">
              <span className="font-bold flex-shrink-0">&bull;</span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Footer: Contact + QR */}
      <div className="grid grid-cols-[1fr_auto] gap-4 border-t-2 border-black pt-2">
        <div className="flyer-section">
          <h2 className="text-xs font-black uppercase tracking-widest mb-1.5">Contact</h2>
          <dl className="text-xs space-y-1">
            <div className="flex items-center gap-1.5">
              <PhoneIcon className="w-3.5 h-3.5 flex-shrink-0" />
              <dt className="sr-only">311 Phone</dt>
              <dd>{brief.contactInfo.phone311}</dd>
            </div>
            <div className="flex items-center gap-1.5">
              <BuildingIcon className="w-3.5 h-3.5 flex-shrink-0" />
              <dt className="sr-only">Council District</dt>
              <dd>{brief.contactInfo.councilDistrict}</dd>
            </div>
            <div className="flex items-center gap-1.5">
              <MapPinIcon className="w-3.5 h-3.5 flex-shrink-0" />
              <dt className="sr-only">Nearest Resource</dt>
              <dd>{brief.contactInfo.anchorLocation}</dd>
            </div>
          </dl>
        </div>

        <div className="flex flex-col items-center">
          <QRCodeSVG value={qrUrl} size={72} level="M" />
          <p className="text-[9px] mt-1 text-center font-medium">Scan to view online</p>
        </div>
      </div>

      {/* Bottom tagline */}
      <div className="border-t border-black mt-2 pt-1 text-center">
        <p className="text-[9px] font-medium tracking-wide">
          Block Report &middot; Your neighborhood, your voice &middot; More resources at {window.location.origin}/resources
        </p>
      </div>
    </div>
  );
}
