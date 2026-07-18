import { Controller, Post, Body, Patch, Request } from '@nestjs/common';
import { AuthenticationService } from './authentication.service';
import { CreateAuthenticationDto } from './dto/create-authentication.dto';
import { Public } from './auth/public.decorator';

@Controller('authentication')
export class AuthenticationController {
  constructor(private readonly authenticationService: AuthenticationService) {}

  @Public()
  @Post()
  create(@Body() createAuthenticationDto: CreateAuthenticationDto) {
    return this.authenticationService.login(createAuthenticationDto);
  }

  @Patch('change-password')
  changePassword(
    @Request() req: any,
    @Body() body: { ancien_mot_de_passe: string; nouveau_mot_de_passe: string },
  ) {
    return this.authenticationService.changePassword(req.user.userId, body);
  }
}
