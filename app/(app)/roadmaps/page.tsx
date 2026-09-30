'use client';

import React, { useState } from 'react';
import { useRoadmaps } from '@/lib/hooks/useRoadmaps';
import { RoadmapHeader } from '@/components/roadmaps/RoadmapHeader';
import { RoadmapTrackTabs } from '@/components/roadmaps/RoadmapTrackTabs';
import { RoadmapOverviewCard } from '@/components/roadmaps/RoadmapOverviewCard';
import { MilestoneSequence } from '@/components/roadmaps/MilestoneSequence';
import { RoadmapActiveInspector } from '@/components/roadmaps/RoadmapActiveInspector';
import { TrackOrchestrationCard } from '@/components/roadmaps/TrackOrchestrationCard';
import { AiDiagnosticCard } from '@/components/roadmaps/AiDiagnosticCard';
import { CreateRoadmapModal } from '@/components/roadmaps/CreateRoadmapModal';
import { AttachCourseModal } from '@/components/roadmaps/AttachCourseModal';
import { Spinner } from '@/components/ui/Spinner/Spinner';
import { Alert } from '@/components/ui/Alert/Alert';
import type { RoadmapNode, AttachedCourseData } from '@/lib/types';
import styles from './RoadmapsPage.module.css';

export default function RoadmapsPage() {
  const {
    tracks,
    activeTrack,
    activeTrackId,
    setActiveTrackId,
    selectedNode,
    selectedNodeId,
    setSelectedNodeId,
    isLoading,
    error,
    createTrack,
    appendNode,
    updateNode
  } = useRoadmaps();

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [attachingNode, setAttachingNode] = useState<RoadmapNode | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleCreateTrackSubmit = async (title: string, description: string, category: string) => {
    await createTrack(title, description, category);
    showToast('New roadmap track created successfully!');
  };

  const handleAppendNodeClick = async () => {
    if (!activeTrack) return;
    const nextIdx = activeTrack.nodes.length + 1;
    await appendNode(
      activeTrack.id,
      `Advanced Topic ${nextIdx}`,
      'Deep milestone competency and hands-on laboratory exploration.'
    );
    showToast(`Milestone node ${nextIdx} appended to sequence!`);
  };

  const handleAttachCourseSubmit = async (nodeId: string, courseData: AttachedCourseData) => {
    if (!activeTrack) return;
    await updateNode(activeTrack.id, nodeId, {
      attached_course: courseData,
      status: courseData.progress_percentage === 100 ? 'completed' : 'in_progress',
      progress_percentage: courseData.progress_percentage
    });
    showToast(`Course "${courseData.title}" linked to milestone!`);
  };

  const handleInsertMicroDrill = async () => {
    if (!activeTrack) return;
    await appendNode(
      activeTrack.id,
      'SPI Bus Clock Polarity & Phase (CPOL/CPHA) Micro-Drill',
      'Focused 45-minute lab verifying oscilloscope captures of SPI mode 0/1/2/3 multi-master arbitration.',
      ['spi', 'micro-drill', 'protocols']
    );
    showToast('Micro-Drill inserted into track sequence!');
  };

  if (isLoading) {
    return (
      <div className={styles.loadingContainer}>
        <Spinner size="lg" />
        <span className={styles.loadingText}>Loading Learning Roadmaps &amp; Trajectories...</span>
      </div>
    );
  }

  if (error && tracks.length === 0) {
    return (
      <div className={styles.page}>
        <Alert variant="error" title="Failed to load roadmaps">
          {error}
        </Alert>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      {toastMessage && (
        <div className={styles.toast}>
          <span>✓</span>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header & Breadcrumb */}
      <RoadmapHeader
        onCreateClick={() => setIsCreateModalOpen(true)}
        onImportClick={() => showToast('Template catalog loaded.')}
        onSettingsClick={() => showToast('Roadmap settings opened.')}
      />

      {/* Track Selection Tabs */}
      <RoadmapTrackTabs
        tracks={tracks}
        activeTrackId={activeTrackId}
        onSelectTrack={(id) => {
          setActiveTrackId(id);
          const t = tracks.find((tr) => tr.id === id);
          if (t && t.nodes[0]) {
            setSelectedNodeId(t.nodes[0].id);
          }
        }}
        onAddCustomTrack={() => setIsCreateModalOpen(true)}
      />

      {activeTrack && (
        <>
          {/* Active Track Overview Header Card */}
          <RoadmapOverviewCard
            track={activeTrack}
            onAddStepClick={handleAppendNodeClick}
            onLinkCourseClick={() => {
              if (selectedNode) setAttachingNode(selectedNode);
            }}
            onReorderClick={() => showToast('Milestone sequence reordering enabled.')}
            onShareClick={() => {
              if (typeof navigator !== 'undefined' && navigator.clipboard) {
                navigator.clipboard.writeText(window.location.href);
                showToast('Roadmap share link copied to clipboard!');
              }
            }}
          />

          {/* Two-Column Grid: Left Sequence Timeline, Right Inspector Stack */}
          <div className={styles.mainLayout}>
            <div className={styles.sequenceCol}>
              <MilestoneSequence
                track={activeTrack}
                selectedNodeId={selectedNodeId}
                onSelectNode={(nodeId) => setSelectedNodeId(nodeId)}
                onAppendNodeClick={handleAppendNodeClick}
                onAttachCourseClick={(node) => setAttachingNode(node)}
              />
            </div>

            <div className={styles.inspectorCol}>
              {selectedNode && (
                <RoadmapActiveInspector
                  track={activeTrack}
                  node={selectedNode}
                  onLinkCourseSubmit={(courseTitle) => {
                    handleAttachCourseSubmit(selectedNode.id, {
                      id: `course_${Date.now()}`,
                      title: courseTitle,
                      provider: 'StudyFlow Catalog',
                      total_lectures: 12,
                      completed_lectures: 0,
                      progress_percentage: 0,
                      runtime_formatted: '0 of 12 Lectures (0%)'
                    });
                  }}
                />
              )}

              <TrackOrchestrationCard
                track={activeTrack}
                onArchiveClick={() => showToast('Roadmap track archived.')}
                onChangelogClick={() => showToast('Roadmap changelog v2.4 viewed.')}
              />

              <AiDiagnosticCard onInsertMicroDrill={handleInsertMicroDrill} />
            </div>
          </div>
        </>
      )}

      {/* Create Custom Roadmap Modal */}
      <CreateRoadmapModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSubmit={handleCreateTrackSubmit}
      />

      {/* Attach Course Modal */}
      {attachingNode && (
        <AttachCourseModal
          isOpen={Boolean(attachingNode)}
          node={attachingNode}
          onClose={() => setAttachingNode(null)}
          onSubmit={handleAttachCourseSubmit}
        />
      )}
    </div>
  );
}
