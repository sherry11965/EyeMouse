package main

import (
	"log"
	"net/http"
	"os"

	"atown/internal/server"
)

func main() {
	addr := os.Getenv("ATOWN_ADDR")
	if addr == "" {
		addr = ":8080"
	}

	handler := server.New()
	log.Printf("ATown backend listening on %s", addr)
	if err := http.ListenAndServe(addr, handler); err != nil {
		log.Fatal(err)
	}
}
