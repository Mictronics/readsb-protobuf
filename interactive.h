//
// Created by user on 9/9/20.
//

#ifndef READSB_INTERACTIVE_H
#define READSB_INTERACTIVE_H

#ifdef __cplusplus
extern "C" {
#endif

//
// Functions exported from interactive.c
//
void interactiveInit (void);
void interactiveShowData (void);
void interactiveCleanup (void);

#ifdef __cplusplus
}
#endif

#endif //READSB_INTERACTIVE_H
