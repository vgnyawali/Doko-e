UPDATE site_settings SET data=json_set(data,'$.shipping_enabled.local_only',json('true')) WHERE id='main';
UPDATE site_settings SET data=json_insert(data,'$.delivery_instructions','Delivery is available in the Greater Boston area only. Enter your delivery address at checkout. Contact order@doko-e.com with delivery questions.') WHERE id='main';
