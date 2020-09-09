// Part of readsb, a Mode-S/ADSB/TIS message decoder.
//
// net_io.h: network handling.
//
// Copyright (c) 2020 Michael Wolf <michael@mictronics.de>
//
// This code is based on a detached fork of dump1090-fa.
//
// Copyright (c) 2014,2015 Oliver Jowett <oliver@mutability.co.uk>
//
// This file is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// any later version.
//
// This file is distributed in the hope that it will be useful, but
// WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU
// General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with this program.  If not, see <http://www.gnu.org/licenses/>.

#ifndef NETIO_H
#define NETIO_H

#include <sys/socket.h>

// Describes a networking service (group of connections)

struct aircraft;
struct modesMessage;
struct client;
struct net_service;
typedef int (*read_fn)(struct client *, char *, int);
typedef void (*heartbeat_fn)(struct net_service *);

void displayModesMessage(struct modesMessage *mm);
void useModesMessage(struct modesMessage *mm);

typedef enum {
    READ_MODE_IGNORE,
    READ_MODE_BEAST,
    READ_MODE_BEAST_COMMAND,
    READ_MODE_ASCII
} read_mode_t;

/* Data mode to feed push server */
typedef enum {
    PUSH_MODE_RAW,
    PUSH_MODE_BEAST,
    PUSH_MODE_SBS,
} push_mode_t;

// Describes one network service (a group of clients with common behaviour)

struct net_service {
    int listener_count; // number of listeners
    int pusher_count; // Number of push servers connected to
    int connections; // number of active clients
    read_mode_t read_mode;
    read_fn read_handler;
    struct net_writer *writer; // shared writer state
    struct net_service* next;
    int *listener_fds; // listening FDs
    const char *read_sep; // hander details for input data
    int read_sep_len;
    const char *descr;
    struct client *clients; // linked list of clients connected to this service
};

// Client connection

struct net_connector {
    char *address;
    char *port;
    char *protocol;
    struct net_service *service;
    int connected;
    int connecting;
    int fd;
    uint64_t next_reconnect;
    uint64_t connect_timeout;
    char resolved_addr[NI_MAXHOST + 3];
    struct addrinfo *addr_info;
    struct addrinfo *try_addr; // pointer walking addr_info list
    int gai_error;
    int gai_request_in_progress;
    pthread_t thread;
    pthread_mutex_t *mutex;
};

// Structure used to describe a networking client

struct client {
    struct net_service *service; // Service this client is part of
    struct client* next; // Pointer to next client
    int fd; // File descriptor
    int buflen; // Amount of data on buffer
    int modeac_requested; // 1 if this Beast output connection has asked for A/C
    uint64_t last_flush;
    uint64_t last_send;
    uint64_t last_read; // This is used on write-only clients to help check for dead connections
    char buf[MODES_CLIENT_BUF_SIZE + 4]; // Read buffer+padding
    void *sendq; // Write buffer - allocated later
    int sendq_len; // Amount of data in SendQ
    int sendq_max; // Max size of SendQ
    char host[NI_MAXHOST]; // For logging
    char port[NI_MAXSERV];
    struct net_connector *con;
};

// Common writer state for all output sockets of one type

struct net_writer {
    void *data; // shared write buffer, sized MODES_OUT_BUF_SIZE
    int dataUsed; // number of bytes of write buffer currently used
#if !defined(__arm__)
    uint32_t padding;
#endif
    struct net_service *service; // owning service
    heartbeat_fn send_heartbeat; // function that queues a heartbeat if needed
    uint64_t lastWrite; // time of last write to clients
};

// GNS HULC status message

typedef union __packed {
    unsigned char buf[24];

    struct _packed {
        uint32_t serial;
        uint16_t flags;
        uint16_t reserved;
        uint32_t epoch;
        uint32_t latitude;
        uint32_t longitude;
        uint16_t altitude;
        uint8_t satellites;
        uint8_t hdop;
    } status;
} hulc_status_msg_t;

struct net_service *serviceInit(const char *descr, struct net_writer *writer, heartbeat_fn hb_handler, read_mode_t mode, const char *sep, read_fn read_handler);
struct client *serviceConnect(struct net_connector *con);
void serviceReconnectCallback(uint64_t now);
struct client *checkServiceConnected(struct net_connector *con);
void serviceListen(struct net_service *service, char *bind_addr, char *bind_ports);
struct client *createSocketClient(struct net_service *service, int fd);
struct client *createGenericClient(struct net_service *service, int fd);

// viewadsb want to create these itselves
struct net_service *makeBeastInputService(void);
struct net_service *makeFatsvOutputService(void);

struct char_buffer {
    char *buffer;
    size_t len;
};

void sendBeastSettings(int fd, const char *settings);

void modesInitNet(void);
void modesQueueOutput(struct modesMessage *mm, struct aircraft *a);
void modesNetSecondWork(void);
void modesNetPeriodicWork(void);
void cleanupNetwork(void);

struct char_buffer generateVRS(int part, int n_parts);
void writeJsonToNet(struct net_writer *writer, struct char_buffer cb);
void generateAircraftProtoBuf(void);
void generateHistoryProtoBuf(const char *file);
void generateReceiverProtoBuf(void);
void generateStatsProtoBuf(void);

#endif
