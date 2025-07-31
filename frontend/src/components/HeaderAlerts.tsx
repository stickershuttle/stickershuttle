import React, { useState, useEffect } from 'react';
import { useQuery, gql } from '@apollo/client';

// GraphQL query to get active header alerts
const GET_ACTIVE_HEADER_ALERTS = gql`
  query GetActiveHeaderAlerts {
    getAllSitewideAlerts {
      id
      title
      message
      backgroundColor
      textColor
      linkUrl
      linkText
      isActive
      startDate
      endDate
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
  isActive: boolean;
  startDate?: string;
  endDate?: string;
}

export default function HeaderAlerts() {
  const [dismissedAlerts, setDismissedAlerts] = useState<string[]>([]);
  const { data, loading, error } = useQuery(GET_ACTIVE_HEADER_ALERTS, {
    pollInterval: 60000, // Refresh every minute
  });

  // Filter for active alerts that are within date range and not dismissed
  const activeAlerts = data?.getAllSitewideAlerts?.filter((alert: Alert) => {
    if (!alert.isActive || dismissedAlerts.includes(alert.id)) {
      return false;
    }

    const now = new Date();
    const startDate = alert.startDate ? new Date(alert.startDate) : null;
    const endDate = alert.endDate ? new Date(alert.endDate) : null;

    // Check if alert is within date range
    if (startDate && now < startDate) return false;
    if (endDate && now > endDate) return false;

    return true;
  }) || [];

  // Update CSS custom property for header alerts height
  useEffect(() => {
    const alertsHeight = activeAlerts.length * 36; // 36px per alert
    document.documentElement.style.setProperty('--header-alerts-height', `${alertsHeight}px`);
    
    return () => {
      document.documentElement.style.setProperty('--header-alerts-height', '0px');
    };
  }, [activeAlerts.length]);

  const handleDismissAlert = (alertId: string) => {
    setDismissedAlerts(prev => [...prev, alertId]);
  };

  if (loading || error || !data?.getAllSitewideAlerts || activeAlerts.length === 0) {
    return null;
  }

  return (
    <div className="w-full fixed top-0 z-[60]">
      {activeAlerts.map((alert: Alert, index: number) => (
        <div
          key={alert.id}
          className="w-full py-2 px-4 text-center relative text-white"
          style={{
            backgroundColor: '#030140', // Same as header background
            top: `${index * 36}px`, // Stack alerts vertically (36px = py-2 * 2 + text height)
          }}
        >
          <div className="text-sm">
            <span>{alert.message}</span>
            {alert.linkUrl && (
              <>
                {' • '}
                <a
                  href={alert.linkUrl}
                  className="underline hover:no-underline"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Learn More
                </a>
              </>
            )}
          </div>
          
          {/* Dismiss button */}
          <button
            onClick={() => handleDismissAlert(alert.id)}
            className="absolute right-4 top-1/2 transform -translate-y-1/2 hover:opacity-70 transition-opacity duration-200 text-white"
            aria-label="Dismiss alert"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      ))}
    </div>
  );
}