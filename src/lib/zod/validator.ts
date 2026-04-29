import type { ZodType } from "zod";


export function zodValidateSchema<T>(input:T, schema:ZodType):{error:true, message: string[]}|{error:false, message: undefined} {
  const parsed = schema.safeParse(input);
  if(parsed.success){
    return { error: false,  message: undefined };
  }
  const messages: string[] = [];
  parsed.error.issues.forEach((err) => {
    if(err.message){
      messages.push(err.message);
    }
  });
  return { error: true, message: messages };
}