import { Request, Response, NextFunction } from 'express';
import { ZodError, z } from 'zod';

export const validate = (schema: z.ZodTypeAny | any) => async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validatedData = await schema.parseAsync({
      body: req.body,
      query: req.query,
      params: req.params,
    });
    // req.body es asignable; req.query y req.params son objetos de solo lectura en Express
    // por eso usamos Object.assign en lugar de reasignar directamente
    if (validatedData.body !== undefined) req.body = validatedData.body;
    if (validatedData.query !== undefined) Object.assign(req.query, validatedData.query);
    if (validatedData.params !== undefined) Object.assign(req.params, validatedData.params);
    next();
  } catch (error: any) {
    if (error instanceof z.ZodError || error.name === 'ZodError' || error.issues) {
      return res.status(400).json({
        message: 'Error de validación',
        errors: error.issues.map((err: any) => ({
          field: err.path.slice(1), // remover body/query/params
          message: err.message,
        })),
      });
    }
    console.error('Error in validate middleware:', error);
    return res.status(500).json({ message: 'Error interno del servidor', error: error.message });
  }
};
