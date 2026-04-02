import { Controller, Get, Post, Body, Patch, Param, Query } from '@nestjs/common';
import { SurveysService } from './surveys.service';
import { Auth } from '../auth/decorators/auth.decorator';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { Roles } from '../../common/enums/roles.enum';

@Controller('surveys')
export class SurveysController {
  constructor(private readonly surveysService: SurveysService) { }

  @Post()
  @Auth(Roles.User)
  @Permissions('surveys:create')
  create(@Body() createSurveyDto: any) {
    return this.surveysService.createSurvey(createSurveyDto);
  }

  @Get()
  @Auth(Roles.User)
  @Permissions('surveys:view')
  findAll() {
    return this.surveysService.findAllSurveys();
  }

  @Get('active')
  @Auth(Roles.User)
  @Permissions('surveys:view')
  findActive(@Query('trigger') trigger: string) {
    return this.surveysService.findActiveSurvey(trigger || 'post-purchase');
  }

  @Get(':id')
  @Auth(Roles.User)
  @Permissions('surveys:view')
  findOne(@Param('id') id: string) {
    return this.surveysService.findSurveyById(id);
  }

  @Patch(':id')
  @Auth(Roles.User)
  @Permissions('surveys:edit')
  update(@Param('id') id: string, @Body() updateSurveyDto: any) {
    return this.surveysService.updateSurvey(id, updateSurveyDto);
  }

  @Post('responses')
  @Auth(Roles.User)
  @Permissions('surveys:create')
  saveResponse(@Body() responseDto: any) {
    return this.surveysService.saveResponse(responseDto);
  }

  @Get(':id/responses')
  @Auth(Roles.User)
  @Permissions('surveys:view')
  findResponses(@Param('id') id: string) {
    return this.surveysService.findResponsesBySurvey(id);
  }

  @Get('responses/filter')
  @Auth(Roles.User)
  @Permissions('surveys:view')
  filterResponses(@Query('tag') tag: string, @Query('value') value: string) {
    return this.surveysService.findClientsByAnswerMetadata(tag, value);
  }
}
