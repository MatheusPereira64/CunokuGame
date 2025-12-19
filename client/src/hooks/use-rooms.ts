import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { z } from "zod";

type CreateRoomRequest = { 
  name: string; 
  gameMode?: "multiplayer" | "vs_bots"; 
  botDifficulty?: "easy" | "medium" | "hard" 
};

type JoinRoomRequest = { code: string; name: string };

export function useRooms() {
  return useQuery({
    queryKey: [api.rooms.list.path],
    queryFn: async () => {
      const res = await fetch(api.rooms.list.path);
      if (!res.ok) throw new Error("Failed to fetch rooms");
      return api.rooms.list.responses[200].parse(await res.json());
    },
  });
}

export function useCreateRoom() {
  return useMutation({
    mutationFn: async (data: CreateRoomRequest) => {
      const validated = api.rooms.create.input.parse({
        playerName: data.name,
        gameMode: data.gameMode || "multiplayer",
        botDifficulty: data.botDifficulty || "medium",
      });
      const res = await fetch(api.rooms.create.path, {
        method: api.rooms.create.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validated),
      });
      
      if (!res.ok) {
        const errorData = await res.json();
        const error = api.rooms.create.responses[400].parse(errorData);
        throw new Error(error.message || "Failed to create room");
      }
      
      return api.rooms.create.responses[201].parse(await res.json());
    },
  });
}

export function useJoinRoom() {
  return useMutation({
    mutationFn: async (data: JoinRoomRequest) => {
      const validated = api.rooms.join.input.parse({ code: data.code, playerName: data.name });
      const res = await fetch(api.rooms.join.path, {
        method: api.rooms.join.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validated),
      });

      if (!res.ok) {
        if (res.status === 404) throw new Error("Room not found");
        throw new Error("Failed to join room");
      }

      return api.rooms.join.responses[200].parse(await res.json());
    },
  });
}
