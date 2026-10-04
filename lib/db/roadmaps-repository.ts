import { SupabaseClient } from '@supabase/supabase-js';
import { AppError } from '../errors';
import { logger } from '../logging';
import { RoadmapTrack, RoadmapNode } from '../types';

export const INITIAL_ROADMAP_TRACKS: RoadmapTrack[] = [
  {
    id: 'track_embedded_systems',
    user_id: 'default',
    title: 'Embedded Systems Engineer',
    description: 'Complete hardware-to-software firmware trajectory spanning bare-metal C programming, ARM Cortex internals, RTOS microkernels, and automotive bus systems.',
    category: 'Embedded & Systems Architecture',
    status_badge: 'IN PRODUCTION',
    author: 'Created by You',
    last_updated: 'Last updated 2 hours ago',
    total_nodes_count: 9,
    completed_nodes_count: 4,
    active_nodes_count: 2,
    mastery_percentage: 67,
    pipeline_state: '6 of 9 Active',
    linked_courses_count: 4,
    total_hours_logged: 68,
    estimated_completion_date: 'Apr 24, 2026',
    pacing_status: '14% ahead of baseline trajectory',
    nodes: [
      {
        id: 'node_01',
        roadmap_id: 'track_embedded_systems',
        node_number: '01',
        title: 'C Programming & Memory Fundamentals',
        description: 'Pointers, stack vs heap allocations, structs, bitwise operators, endianness, and deterministic memory safety.',
        status: 'completed',
        progress_percentage: 100,
        hours_logged: 14,
        tags: ['c-lang', 'memory-management', 'pointers'],
        attached_course: {
          id: 'course_c_fundamentals',
          title: 'Modern C for Systems Engineers',
          provider: 'Embedded Expert IO',
          total_lectures: 16,
          completed_lectures: 16,
          progress_percentage: 100,
          runtime_formatted: '100% Watched'
        }
      },
      {
        id: 'node_02',
        roadmap_id: 'track_embedded_systems',
        node_number: '02',
        title: 'Embedded C & Hardware Abstraction',
        description: 'Volatile keyword invariants, register bit-masking, memory-mapped I/O (MMIO), inline assembly, and memory barrier primitives.',
        status: 'completed',
        progress_percentage: 100,
        hours_logged: 18,
        tags: ['embedded', 'hardware-registers', 'mmio'],
        attached_course: {
          id: 'course_mit_6004',
          title: 'MIT 6.004: C Internals & Computation Structures',
          provider: 'MIT OpenCourseWare',
          total_lectures: 24,
          completed_lectures: 24,
          progress_percentage: 100,
          runtime_formatted: 'All Modules Completed'
        }
      },
      {
        id: 'node_03',
        roadmap_id: 'track_embedded_systems',
        node_number: '03',
        title: 'Microcontrollers & CPU Architecture',
        description: 'ARM Cortex-M pipeline architecture, NVIC vector table relocations, clock tree distribution (PLL), and system low-power sleep modes.',
        status: 'completed',
        progress_percentage: 100,
        hours_logged: 12,
        tags: ['arm-cortex', 'nvic', 'interrupts'],
        attached_course: {
          id: 'course_arm_baremetal',
          title: 'ARM Cortex-M Bare-Metal Deep Dive',
          provider: 'FastBit Academy',
          total_lectures: 20,
          completed_lectures: 20,
          progress_percentage: 100,
          runtime_formatted: 'Verified Capstone Passed'
        }
      },
      {
        id: 'node_04',
        roadmap_id: 'track_embedded_systems',
        node_number: '04',
        title: 'Serial Protocols: UART / SPI / I2C',
        description: 'Baud rate generators, circular ring buffers, DMA transfers without CPU overhead, and multi-master I2C bus arbitration.',
        status: 'completed',
        progress_percentage: 100,
        hours_logged: 9,
        tags: ['protocols', 'uart', 'spi', 'i2c'],
        attached_course: {
          id: 'course_bus_masterclass',
          title: 'High-Speed Bus Protocols Masterclass',
          provider: 'Hardware Academy',
          total_lectures: 14,
          completed_lectures: 14,
          progress_percentage: 100,
          runtime_formatted: 'Laboratory Bench Scopes Verified'
        }
      },
      {
        id: 'node_05',
        roadmap_id: 'track_embedded_systems',
        node_number: '05',
        title: 'Real-Time Operating Systems (RTOS)',
        description: 'Preemptive vs cooperative scheduling, task priorities, binary and counting semaphores, mutex deadlock avoidance, and priority inversion.',
        status: 'active',
        progress_percentage: 65,
        hours_logged: 15,
        tags: ['rtos', 'freertos', 'concurrency', 'scheduling'],
        attached_course: {
          id: 'course_freertos',
          title: 'FreeRTOS Architecture & Real-Time Kernel',
          provider: 'Embedded Expert IO',
          total_lectures: 12,
          completed_lectures: 8,
          progress_percentage: 67,
          next_chapter: 'Chapter 09 — Mutexes & Priority Inversion',
          runtime_formatted: 'Next: 34m runtime'
        }
      },
      {
        id: 'node_06',
        roadmap_id: 'track_embedded_systems',
        node_number: '06',
        title: 'STM32 & Bare-Metal Peripheral Drivers',
        description: 'STM32CubeIDE ecosystem, comparison of HAL vs LL registers, advanced timers, hardware PWM generation, and multi-channel ADC DMA circular sampling.',
        status: 'in_progress',
        progress_percentage: 20,
        hours_logged: 4,
        tags: ['stm32', 'peripherals', 'pwm', 'dma'],
        attached_course: {
          id: 'course_stm32_scratch',
          title: 'STM32 Development from Scratch',
          provider: 'Embedded System Pro',
          total_lectures: 10,
          completed_lectures: 2,
          progress_percentage: 20,
          runtime_formatted: '2 of 10 Lectures'
        }
      },
      {
        id: 'node_07',
        roadmap_id: 'track_embedded_systems',
        node_number: '07',
        title: 'ESP32 & Wireless IoT Connectivity',
        description: 'Dual-core FreeRTOS scheduling, Wi-Fi 802.11 stack initialization, BLE Mesh protocols, MQTT cloud telemetry with TLS, and ultra-low power co-processor modes.',
        status: 'locked',
        progress_percentage: 0,
        hours_logged: 0,
        tags: ['esp32', 'iot', 'wireless'],
        prerequisite_label: 'Prerequisite: RTOS',
        suggested_course_title: 'ESP32 IoT Production Systems'
      },
      {
        id: 'node_08',
        roadmap_id: 'track_embedded_systems',
        node_number: '08',
        title: 'Controller Area Network (CAN Bus) & Automotive',
        description: 'CAN 2.0B and CAN-FD differential signaling, arbitration IDs, bit-stuffing error states, transceivers, and ISO 14229 / OBD-II diagnostic message stacks.',
        status: 'locked',
        progress_percentage: 0,
        hours_logged: 0,
        tags: ['can-bus', 'automotive'],
        prerequisite_label: 'Upcoming'
      },
      {
        id: 'node_09',
        roadmap_id: 'track_embedded_systems',
        node_number: '09',
        title: 'Embedded Linux & Yocto Project',
        description: 'U-Boot initialization, Device Tree Source (.dts) configuration, compiling custom Linux kernel builds, and assembling minimal embedded root filesystems using Yocto/BitBake recipes.',
        status: 'capstone',
        progress_percentage: 0,
        hours_logged: 0,
        tags: ['embedded-linux', 'yocto', 'kernel'],
        prerequisite_label: 'Capstone Milestone'
      }
    ]
  },
  {
    id: 'track_distributed_systems',
    user_id: 'default',
    title: 'Distributed Systems Architect',
    description: 'Master fault-tolerant consensus, distributed transactions, event streaming pipelines, and geo-replicated data stores.',
    category: 'Cloud & Distributed Infrastructure',
    status_badge: 'IN PROGRESS',
    author: 'Created by You',
    last_updated: 'Last updated yesterday',
    total_nodes_count: 7,
    completed_nodes_count: 3,
    active_nodes_count: 1,
    mastery_percentage: 42,
    pipeline_state: '3 of 7 Active',
    linked_courses_count: 3,
    total_hours_logged: 41,
    estimated_completion_date: 'Jun 15, 2026',
    pacing_status: 'On track with weekly target',
    nodes: [
      {
        id: 'node_dist_01',
        roadmap_id: 'track_distributed_systems',
        node_number: '01',
        title: 'Distributed Systems Fundamentals & RPC',
        description: 'CAP theorem, vector clocks, serialization protocols (Protobuf / gRPC), and network partition failure modes.',
        status: 'completed',
        progress_percentage: 100,
        hours_logged: 12,
        tags: ['distributed', 'grpc', 'cap-theorem']
      },
      {
        id: 'node_dist_02',
        roadmap_id: 'track_distributed_systems',
        node_number: '02',
        title: 'Consensus Protocols: Paxos & Raft',
        description: 'Leader election, log replication, safety invariants, joint consensus cluster membership changes, and snapshotting.',
        status: 'completed',
        progress_percentage: 100,
        hours_logged: 16,
        tags: ['raft', 'paxos', 'consensus']
      },
      {
        id: 'node_dist_03',
        roadmap_id: 'track_distributed_systems',
        node_number: '03',
        title: 'Event Streaming & Kafka Architecture',
        description: 'Partition logs, consumer rebalancing, zero-copy socket transfers, schema registries, and exactly-once semantics.',
        status: 'active',
        progress_percentage: 45,
        hours_logged: 13,
        tags: ['kafka', 'streaming', 'event-driven']
      },
      {
        id: 'node_dist_04',
        roadmap_id: 'track_distributed_systems',
        node_number: '04',
        title: 'Distributed Transactions & 2PC / Sagas',
        description: 'Two-phase commit coordinator failure modes, Saga orchestrators vs choreography, and TCC compensations.',
        status: 'locked',
        progress_percentage: 0,
        hours_logged: 0,
        tags: ['transactions', '2pc', 'sagas']
      }
    ]
  },
  {
    id: 'track_compilers',
    user_id: 'default',
    title: 'Compilers & Virtual Machines',
    description: 'Lexing, AST generation, LLVM IR optimization passes, register allocation, and WebAssembly JIT runtime development.',
    category: 'Programming Languages & Runtimes',
    status_badge: 'PLANNED',
    author: 'Created by You',
    last_updated: 'Last updated 3 days ago',
    total_nodes_count: 8,
    completed_nodes_count: 2,
    active_nodes_count: 1,
    mastery_percentage: 25,
    pipeline_state: '2 of 8 Active',
    linked_courses_count: 2,
    total_hours_logged: 22,
    estimated_completion_date: 'Aug 30, 2026',
    pacing_status: 'Pacing steady',
    nodes: [
      {
        id: 'node_comp_01',
        roadmap_id: 'track_compilers',
        node_number: '01',
        title: 'Lexical Analysis & Parsing Algorithms',
        description: 'Regular expressions, DFAs, recursive descent parsers, Pratt precedence climbing, and AST synthesis.',
        status: 'completed',
        progress_percentage: 100,
        hours_logged: 11,
        tags: ['lexing', 'parsing', 'ast']
      },
      {
        id: 'node_comp_02',
        roadmap_id: 'track_compilers',
        node_number: '02',
        title: 'Type Checking & Semantic Analysis',
        description: 'Hindley-Milner type inference, symbol tables, lexical scoping rules, and borrow checker semantics.',
        status: 'active',
        progress_percentage: 30,
        hours_logged: 11,
        tags: ['type-systems', 'semantics']
      }
    ]
  }
];

export class RoadmapsRepository {
  // In-memory cache synced per process / browser session with local storage fallback
  private customTracks: Map<string, RoadmapTrack[]> = new Map();

  async listTracks(client: SupabaseClient, userId: string): Promise<RoadmapTrack[]> {
    const userTracks = this.customTracks.get(userId);
    if (userTracks && userTracks.length > 0) {
      return userTracks;
    }

    return [];
  }

  async getTrackById(client: SupabaseClient, userId: string, trackId: string): Promise<RoadmapTrack | null> {
    const tracks = await this.listTracks(client, userId);
    const found = tracks.find((t) => t.id === trackId);
    return found || null;
  }

  async createTrack(
    client: SupabaseClient,
    userId: string,
    track: {
      title: string;
      description: string;
      category?: string;
    }
  ): Promise<RoadmapTrack> {
    const tracks = await this.listTracks(client, userId);
    const id = `track_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const newTrack: RoadmapTrack = {
      id,
      user_id: userId,
      title: track.title,
      description: track.description || 'Self-directed learning roadmap track.',
      category: track.category || 'Engineering',
      status_badge: 'ACTIVE SEQUENCE',
      author: 'Created by You',
      last_updated: 'Just now',
      total_nodes_count: 1,
      completed_nodes_count: 0,
      active_nodes_count: 1,
      mastery_percentage: 0,
      pipeline_state: '1 Active',
      linked_courses_count: 0,
      total_hours_logged: 0,
      estimated_completion_date: 'TBD',
      pacing_status: 'Ready to begin',
      nodes: [
        {
          id: `node_${Date.now()}_1`,
          roadmap_id: id,
          node_number: '01',
          title: 'Foundations & Setup',
          description: 'Core concepts and environment configuration.',
          status: 'active',
          progress_percentage: 0,
          hours_logged: 0,
          tags: ['foundation', 'getting-started']
        }
      ]
    };

    tracks.push(newTrack);
    this.customTracks.set(userId, tracks);
    return newTrack;
  }

  async appendNode(
    client: SupabaseClient,
    userId: string,
    trackId: string,
    node: {
      title: string;
      description: string;
      tags?: string[];
    }
  ): Promise<RoadmapTrack> {
    const track = await this.getTrackById(client, userId, trackId);
    if (!track) {
      throw new AppError('NOT_FOUND', 'Roadmap track not found', 404);
    }

    const nextIndex = track.nodes.length + 1;
    const nodeNumber = nextIndex < 10 ? `0${nextIndex}` : `${nextIndex}`;
    const newNode: RoadmapNode = {
      id: `node_${Date.now()}_${nextIndex}`,
      roadmap_id: trackId,
      node_number: nodeNumber,
      title: node.title,
      description: node.description || 'Milestone sequence objectives.',
      status: 'locked',
      progress_percentage: 0,
      hours_logged: 0,
      tags: node.tags || ['curriculum']
    };

    track.nodes.push(newNode);
    track.total_nodes_count = track.nodes.length;
    track.pipeline_state = `${track.active_nodes_count} of ${track.total_nodes_count} Active`;
    return track;
  }

  async updateNode(
    client: SupabaseClient,
    userId: string,
    trackId: string,
    nodeId: string,
    updates: Partial<RoadmapNode>
  ): Promise<RoadmapTrack> {
    const track = await this.getTrackById(client, userId, trackId);
    if (!track) {
      throw new AppError('NOT_FOUND', 'Roadmap track not found', 404);
    }

    const node = track.nodes.find((n) => n.id === nodeId);
    if (!node) {
      throw new AppError('NOT_FOUND', 'Milestone node not found', 404);
    }

    Object.assign(node, updates);

    // Recompute track aggregate metrics
    const completed = track.nodes.filter((n) => n.status === 'completed').length;
    const active = track.nodes.filter((n) => n.status === 'active' || n.status === 'in_progress').length;
    track.completed_nodes_count = completed;
    track.active_nodes_count = active;
    track.mastery_percentage = Math.round((completed / track.nodes.length) * 100);
    track.pipeline_state = `${completed + active} of ${track.nodes.length} Active`;

    return track;
  }

  async deleteTrack(client: SupabaseClient, userId: string, trackId: string): Promise<void> {
    const tracks = await this.listTracks(client, userId);
    const updated = tracks.filter((t) => t.id !== trackId);
    this.customTracks.set(userId, updated);
  }
}
