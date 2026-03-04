import { useState, useEffect } from 'react';
import { prepareLapData, extractDriverTimeline } from '../utils/raceCompareUtils';

/**
 * Hook to load and manage race comparison data
 */
export function useRaceCompareData(session, driver1Number, driver2Number) {
  const [data, setData] = useState({
    driver1: { base: null, timeline: null, loading: false, error: null },
    driver2: { base: null, timeline: null, loading: false, error: null },
    completeTimeline: null,
    manifest: null,
    loading: true,
    error: null
  });

  // Load manifest
  useEffect(() => {
    if (!session) return;

    async function loadManifest() {
      try {
        const response = await fetch(`/data/telemetry/${session}/manifest.json`);
        if (!response.ok) throw new Error('Failed to load manifest');
        const manifestData = await response.json();
        setData(prev => ({ ...prev, manifest: manifestData }));
      } catch (err) {
        console.error('Error loading manifest:', err);
        setData(prev => ({ ...prev, error: err.message, loading: false }));
      }
    }

    loadManifest();
  }, [session]);

  // Load complete timeline (once per session)
  useEffect(() => {
    if (!session) return;

    async function loadCompleteTimeline() {
      try {
        const response = await fetch(`/data/telemetry/${session}/event_timeline_complete.json`);
        if (!response.ok) throw new Error('Failed to load timeline');
        const timelineData = await response.json();
        console.log('Complete timeline loaded:', {
          totalEvents: timelineData.events?.length,
          sampleEvent: timelineData.events?.[0]
        });
        setData(prev => ({ ...prev, completeTimeline: timelineData }));
      } catch (err) {
        console.error('Error loading timeline:', err);
        // Timeline is optional for some modes
        setData(prev => ({ ...prev, completeTimeline: null }));
      }
    }

    loadCompleteTimeline();
  }, [session]);

  // Load driver 1 data
  useEffect(() => {
    if (!session || !driver1Number) {
      setData(prev => ({
        ...prev,
        driver1: { base: null, timeline: null, loading: false, error: null }
      }));
      return;
    }

    async function loadDriver1() {
      setData(prev => ({
        ...prev,
        driver1: { ...prev.driver1, loading: true, error: null }
      }));

      try {
        // Load base lap data
        const baseResponse = await fetch(`/data/telemetry/${session}/driver_${driver1Number}.json`);
        if (!baseResponse.ok) throw new Error(`Driver ${driver1Number} data not found`);
        const baseData = await baseResponse.json();
        const preparedBase = prepareLapData(baseData);

        // Extract timeline for this driver - use current state
        setData(prev => {
          let timeline = null;
          if (prev.completeTimeline) {
            timeline = extractDriverTimeline(prev.completeTimeline, driver1Number);
            console.log('Driver 1 timeline extracted:', {
              driverNumber: driver1Number,
              hasTimeline: !!timeline,
              eventCount: timeline?.events?.length
            });
          } else {
            console.log('Driver 1: No complete timeline available yet');
          }
          
          return {
            ...prev,
            driver1: {
              base: preparedBase,
              timeline: timeline,
              loading: false,
              error: null,
              rawData: baseData
            }
          };
        });
      } catch (err) {
        console.error('Error loading driver 1:', err);
        setData(prev => ({
          ...prev,
          driver1: { base: null, timeline: null, loading: false, error: err.message }
        }));
      }
    }

    loadDriver1();
  }, [session, driver1Number]);

  // Load driver 2 data
  useEffect(() => {
    if (!session || !driver2Number) {
      setData(prev => ({
        ...prev,
        driver2: { base: null, timeline: null, loading: false, error: null }
      }));
      return;
    }

    async function loadDriver2() {
      setData(prev => ({
        ...prev,
        driver2: { ...prev.driver2, loading: true, error: null }
      }));

      try {
        // Load base lap data
        const baseResponse = await fetch(`/data/telemetry/${session}/driver_${driver2Number}.json`);
        if (!baseResponse.ok) throw new Error(`Driver ${driver2Number} data not found`);
        const baseData = await baseResponse.json();
        const preparedBase = prepareLapData(baseData);

        // Extract timeline for this driver - use current state
        setData(prev => {
          let timeline = null;
          if (prev.completeTimeline) {
            timeline = extractDriverTimeline(prev.completeTimeline, driver2Number);
            console.log('Driver 2 timeline extracted:', {
              driverNumber: driver2Number,
              hasTimeline: !!timeline,
              eventCount: timeline?.events?.length
            });
          } else {
            console.log('Driver 2: No complete timeline available yet');
          }
          
          return {
            ...prev,
            driver2: {
              base: preparedBase,
              timeline: timeline,
              loading: false,
              error: null,
              rawData: baseData
            }
          };
        });
      } catch (err) {
        console.error('Error loading driver 2:', err);
        setData(prev => ({
          ...prev,
          driver2: { base: null, timeline: null, loading: false, error: err.message }
        }));
      }
    }

    loadDriver2();
  }, [session, driver2Number]);

  // Re-extract timelines when complete timeline loads
  useEffect(() => {
    if (!data.completeTimeline) return;

    console.log('Complete timeline available, re-extracting driver timelines');

    setData(prev => {
      const updates = {};

      // Re-extract driver 1 timeline if we have base data
      if (prev.driver1.base && driver1Number) {
        const timeline = extractDriverTimeline(prev.completeTimeline, driver1Number);
        console.log('Re-extracted driver 1 timeline:', {
          driverNumber: driver1Number,
          eventCount: timeline?.events?.length
        });
        updates.driver1 = { ...prev.driver1, timeline };
      }

      // Re-extract driver 2 timeline if we have base data
      if (prev.driver2.base && driver2Number) {
        const timeline = extractDriverTimeline(prev.completeTimeline, driver2Number);
        console.log('Re-extracted driver 2 timeline:', {
          driverNumber: driver2Number,
          eventCount: timeline?.events?.length
        });
        updates.driver2 = { ...prev.driver2, timeline };
      }

      return { ...prev, ...updates };
    });
  }, [data.completeTimeline, driver1Number, driver2Number]);

  // Update loading state
  useEffect(() => {
    const isLoading = data.driver1.loading || data.driver2.loading;
    setData(prev => ({ ...prev, loading: isLoading }));
  }, [data.driver1.loading, data.driver2.loading]);

  return data;
}
