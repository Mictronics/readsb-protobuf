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
struct _Modes;
void interactiveInit (struct _Modes *Modes);
void interactiveShowData (struct _Modes *Modes);
void interactiveCleanup (struct _Modes *Modes);

#ifdef __cplusplus
}
#endif

#endif //READSB_INTERACTIVE_H
