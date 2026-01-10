import { Request, Response } from 'express';
import { prisma } from '../database.ts';

export const createLocation = async (req: Request, res: Response) => {
  try {
    const { 
      location_name, 
      max_capacity, 
      location_zip_code, 
      location_street, 
      location_number, 
      location_complement, 
      location_neighborhood, 
      location_city, 
      location_state,
      location_country 
    } = req.body;

    const location = await prisma.locations.create({
      data: {
        location_name,
        max_capacity: Number(max_capacity), // Garante que é um número
        location_zip_code,
        location_street,
        location_number,
        location_complement,
        location_neighborhood,
        location_city,
        location_state,
        location_country: location_country || 'Brazil'
      }
    });

    res.status(201).json(location);
  } catch (error) {
    console.error("Erro ao criar localização:", error);
    res.status(500).json({ error: "Erro ao cadastrar a localização. Verifique se todos os campos obrigatórios foram enviados." });
  }
};

export const getAllLocations = async (req: Request, res: Response) => {
  try {
    const locations = await prisma.locations.findMany({
      orderBy: { created_at: 'desc' }
    });
    res.json(locations);
  } catch (error) {
    res.status(500).json({ error: "Erro ao listar localizações." });
  }
};