import React from 'react';
import { useQuery, gql } from '@apollo/client';
import Link from 'next/link';

const GET_ACTIVE_ALERTS = gql`
  query GetActiveSitewideAlerts {
    getActiveSitewideAlerts {
      id
      title
      message
      backgroundColor
      textColor
      linkUrl
      linkText
    }
  }
`;

interface Alert {
  id: string;
  title: string;
  message: string;
  backgroundColor: string;
  textColor: string;
  linkUrl?: string;
  linkText?: string;
}

export default function SitewideAlert() {
  const { data, loading, error } = useQuery(GET_ACTIVE_ALERTS);

  if (loading || error || !data?.getActiveSitewideAlerts?.length) {
    return null;
  }

  // Show the first active alert (you could modify this to show multiple alerts)
  const alert: Alert = data.getActiveSitewideAlerts[0];

  return (
    <div 
      className="w-full py-3 px-4 text-center font-semibold text-sm relative z-50"
      style={{
        backgroundColor: alert.backgroundColor,
        color: alert.textColor
      }}
    >
      <div className="max-w-7xl mx-auto flex items-center justify-center flex-wrap gap-2">
        <span>{alert.title}</span>
        {alert.title && alert.message && ' - '}
        <span>{alert.message}</span>
        {alert.linkUrl && alert.linkText && (
          <Link 
            href={alert.linkUrl}
            className="underline hover:no-underline ml-2 font-bold"
            style={{ color: alert.textColor }}
          >
            {alert.linkText}
          </Link>
        )}
      </div>
    </div>
  );
} 