// Package oop berisi contoh "OOP ala Go" buat dibandingin sama Java.
//
// Go nggak punya class, extends, atau implements. Yang ada:
//   - struct + method          -> pengganti class
//   - huruf kecil/besar        -> pengganti private/public
//   - interface implisit       -> pengganti implements
//   - embedding (komposisi)    -> pengganti extends (tapi BUKAN inheritance)
//   - generics (type param)    -> mirip generics Java, tapi tanpa type erasure
//
// Tiap file di sini fokus ke satu konsep, dan tiap konsep punya test-nya.
package oop
